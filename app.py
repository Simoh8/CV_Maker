from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os, re, json
from io import BytesIO

# PDF/DOCX libs
from pdfminer.high_level import extract_text
import docx

ALLOWED = {'pdf', 'docx'}
UPLOAD_DIR = 'uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__, static_folder='.')

# ---------- Helpers ----------
MONTHS = r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
DATE_RANGE_RE = re.compile(rf'({MONTHS}\s*\d{{4}}|\d{{4}})\s*[-–—]\s*(?:Present|{MONTHS}\s*\d{{4}}|\d{{4}})', re.I)
YEAR_RE = re.compile(r'\b\d{4}\b')

def text_from_docx_bytes(b):
    doc = docx.Document(BytesIO(b))
    paragraphs = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n".join(paragraphs)

def clean_extracted_text(text):
    if not text:
        return ''
    text = re.sub(r'\(cid:\d+\)', '•', text)
    text = re.sub(r'•\s*•+', '•', text)
    text = re.sub(r'\s*•\s*', '\n• ', text)
    text = re.sub(r'\r\n?', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'(mailto:)', '', text, flags=re.I)
    text = ''.join(ch for ch in text if ord(ch) >= 9 and ord(ch) != 11 and ord(ch) != 12)
    text = text.strip()
    return text

HEADING_KEYS = [
    'profile', 'summary', 'experience', 'employment', 'work experience', 'education',
    'skills', 'technical skills', 'technical', 'languages', 'references', 'hobbies',
    'certifications', 'contact', 'personal', 'projects', 'certificates'
]
HEADING_PATTERN = re.compile(r'^\s*(?P<h>(?:' + '|'.join(re.escape(h) for h in HEADING_KEYS) + r'))\s*[:\-]?\s*$', re.I | re.M)

def split_sections(text):
    sections = {}
    for h in HEADING_KEYS:
        sections[h] = ''
    sections['body'] = ''

    lines = [ln for ln in text.splitlines()]
    current = 'body'
    for ln in lines:
        ln_stripped = ln.strip()
        if not ln_stripped:
            sections.setdefault(current, '')
            sections[current] += '\n'
            continue
        m = HEADING_PATTERN.match(ln_stripped)
        if m:
            name = m.group('h').lower()
            key = name
            if key in ('employment', 'work experience'):
                key = 'experience'
            if key in ('technical skills', 'technical'):
                key = 'skills'
            sections.setdefault(key, '')
            current = key
            continue
        sections.setdefault(current, '')
        sections[current] += ln + '\n'
    for k in list(sections.keys()):
        sections[k] = sections[k].strip()
    return sections

def extract_contact_fields(text):
    email = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    phone = re.search(r'(\+?\d[\d\-\s\(\)]{6,}\d)', text)
    github = re.search(r'(github\.com\/[A-Za-z0-9\-_]+)', text, re.I)
    linkedin = re.search(r'(linkedin\.com\/in\/[A-Za-z0-9\-_]+)', text, re.I)

    top_lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:5]
    name = top_lines[0] if top_lines else ''
    title = ''
    if len(top_lines) > 1:
        title_candidate = top_lines[1]
        if len(title_candidate.split()) <= 5 or re.search(r'\bdeveloper|engineer|software|manager|analyst|consultant\b', title_candidate, re.I):
            title = title_candidate

    return {
        'email': email.group(0) if email else '',
        'phone': phone.group(0) if phone else '',
        'github': github.group(0) if github else '',
        'linkedin': linkedin.group(0) if linkedin else '',
        'name': name,
        'title': title
    }

def split_blocks_by_blanklines(text):
    blocks = [b.strip() for b in re.split(r'\n{2,}', text) if b.strip()]
    return blocks

def parse_experience_block(block_text):
    lines = [ln.strip() for ln in block_text.splitlines() if ln.strip()]
    role = ''
    company = ''
    years = ''
    description = ''

    bullets = [ln.lstrip('•').strip() for ln in lines if ln.startswith('•')]
    if bullets:
        description = ' '.join(bullets)
        lines = [ln for ln in lines if not ln.startswith('•')]

    if lines:
        if re.search(r'\s[–—-]\s', lines[0]):
            parts = re.split(r'\s[–—-]\s', lines[0], maxsplit=1)
            role = parts[0].strip()
            company = parts[1].strip()
            for ln in lines[1:3]:
                m = DATE_RANGE_RE.search(ln) or YEAR_RE.search(ln)
                if m:
                    years = m.group(0)
                    break
            rest = lines[1:]
            if rest:
                description = (description + ' ' + ' '.join(rest)).strip()
            return {'role': role, 'company': company, 'years': years, 'description': description.strip()}
        for i, ln in enumerate(lines):
            m = DATE_RANGE_RE.search(ln) or YEAR_RE.search(ln)
            if m:
                years = m.group(0)
                if i >= 1:
                    prev = lines[i-1]
                    if re.search(r'\s[–—-]\s', prev):
                        parts = re.split(r'\s[–—-]\s', prev, maxsplit=1)
                        role, company = parts[0].strip(), parts[1].strip()
                    else:
                        if prev.isupper() or ',' in prev:
                            company = prev
                            role = lines[0] if lines[0] != prev else ''
                        else:
                            role = prev
                    rest = lines[i+1:]
                    if rest:
                        description = ' '.join(rest)
                    description = (description + ' ' + description).strip()
                    return {'role': role, 'company': company, 'years': years, 'description': description.strip()}
        role = lines[0]
        if len(lines) > 1:
            company = lines[1]
        if len(lines) > 2:
            description = ' '.join(lines[2:])
    return {'role': role, 'company': company, 'years': years, 'description': description.strip()}

def parse_experience(text):
    if not text:
        return []
    blocks = split_blocks_by_blanklines(text)
    entries = []
    for b in blocks:
        parsed = parse_experience_block(b)
        if parsed['role'] or parsed['company'] or parsed['description']:
            entries.append(parsed)
    return entries

def parse_education(text):
    if not text:
        return []
    blocks = split_blocks_by_blanklines(text)
    items = []
    for b in blocks:
        lines = [ln.strip() for ln in b.splitlines() if ln.strip()]
        degree = ''
        school = ''
        years = ''
        ymatch = DATE_RANGE_RE.search(b) or YEAR_RE.search(b)
        if ymatch:
            years = ymatch.group(0)
        school_candidates = [ln for ln in lines if re.search(r'\b(University|College|Institute|School|Academy|Technical|KIBABII|THIKA|Nyeri|KIBABII)\b', ln, re.I)]
        degree_candidates = [ln for ln in lines if re.search(r'\b(Degree|BSc|Bachelor|Certificate|Diploma|Kenya Certificate|KCSE|Certificate in)\b', ln, re.I)]
        if degree_candidates:
            degree = degree_candidates[0]
        if not degree and lines:
            if re.search(r'\b(Degree|BSc|Bachelor|Certificate|Diploma)\b', lines[0], re.I):
                degree = lines[0]
        if school_candidates:
            school = school_candidates[0]
        else:
            if len(lines) >= 2:
                school = lines[1]
            elif lines:
                school = lines[0]
        items.append({'degree': degree, 'school': school, 'years': years})
    return items

def parse_skills(text):
    if not text:
        return []
    t = text
    t = re.sub(r'\s*•\s*', ', ', t)
    t = re.sub(r'[\n\r]+', ', ', t)
    parts = [p.strip() for p in re.split(r'[,\|;•·]', t) if p.strip()]
    cleaned = []
    for p in parts:
        p2 = re.sub(r'http\S+|mailto:\S+', '', p).strip()
        if p2 and len(p2) > 1:
            cleaned.append(p2)
    seen = set()
    out = []
    for s in cleaned:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out

def parse_languages(text):
    if not text:
        return []
    t = re.sub(r'[\n\r]+', ', ', text)
    parts = [p.strip() for p in re.split(r'[,\|;•·]', t) if p.strip()]
    return parts[:10]

def parse_references(text):
    if not text:
        return []
    blocks = split_blocks_by_blanklines(text)
    refs = []
    for b in blocks:
        lines = [ln.strip() for ln in b.splitlines() if ln.strip()]
        if not lines:
            continue
        name = lines[0]
        phone = re.search(r'(\+?\d[\d\-\s\(\)]{6,}\d)', b)
        email = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', b)
        refs.append({'name': name, 'phone': phone.group(0) if phone else '', 'email': email.group(0) if email else ''})
    return refs

# ---------- Heuristic reclassification ----------
def reclassify_blocks(sections):
    moved = []
    for src in ('body', 'experience'):
        content = sections.get(src, '')
        if not content:
            continue
        blocks = split_blocks_by_blanklines(content)
        kept_blocks = []
        for b in blocks:
            lower = b.lower()
            if re.search(r'\b(university|college|institute|degree|certificate|bsc|diploma|kenya certificate|kcse|school)\b', lower):
                sections['education'] = (sections.get('education','') + '\n\n' + b).strip()
                moved.append(b)
            else:
                kept_blocks.append(b)
        sections[src] = '\n\n'.join(kept_blocks).strip()
    return sections, moved

# ---------- Main heuristics to JSON ----------
def heuristics_to_json(text):
    t = clean_extracted_text(text)
    contacts = extract_contact_fields(t)
    sections = split_sections(t)

    sections, moved_blocks = reclassify_blocks(sections)

    experience = parse_experience(sections.get('experience','') or sections.get('employment','') or sections.get('work experience',''))
    education = parse_education(sections.get('education',''))
    skills = parse_skills(sections.get('skills','') or sections.get('technical','') or sections.get('technical skills',''))
    soft_skills = []
    soft_block = sections.get('body','')
    m_soft = re.search(r'(soft skill|soft skills|personal skills|core skills|core competencies)', t, re.I)
    if m_soft:
        start = m_soft.start()
        soft_candidate = t[start:start+400]
        soft_skills = [s.strip() for s in re.split(r'[,\n\|;•·]', soft_candidate) if s.strip()]
        soft_skills = [s for s in soft_skills if len(s) < 40][:20]
    else:
        found = re.findall(r'\b(Communication|Adaptability|Leadership|Problem[- ]Solving|Teamwork|Time Management|Creativity|Attention to detail|Resilient|Innovative)\b', t, re.I)
        soft_skills = list(dict.fromkeys(found)) if found else []

    languages = parse_languages(sections.get('languages',''))
    references = parse_references(sections.get('references',''))

    debug = {k: (v[:400] + '...' if len(v) > 400 else v) for k,v in sections.items() if v}
    debug['moved_blocks_count'] = len(moved_blocks)
    debug['top_lines'] = '\n'.join([ln for ln in t.splitlines() if ln.strip()][:8])

    return {
        'personal': {
            'name': contacts.get('name',''),
            'title': contacts.get('title',''),
            'email': contacts.get('email',''),
            'phone': contacts.get('phone',''),
            'github': contacts.get('github',''),
            'linkedin': contacts.get('linkedin','')
        },
        'experience': experience,
        'education': education,
        'skills': skills,
        'soft_skills': soft_skills,
        'languages': languages,
        'references': references,
        '_debug_sections': debug
    }

# ---------- New endpoints for create functionality ----------
@app.route('/api/save', methods=['POST'])
def save_cv():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Save the CV data to a file
        filename = f"cv_{data.get('personal', {}).get('name', 'unknown').replace(' ', '_')}.json"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
            
        return jsonify({'message': 'CV saved successfully', 'filename': filename})
    except Exception as e:
        return jsonify({'error': 'Failed to save CV', 'detail': str(e)}), 500

@app.route('/api/load', methods=['GET'])
def load_cv():
    try:
        filename = request.args.get('filename')
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
            
        filepath = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
            
        with open(filepath, 'r') as f:
            data = json.load(f)
            
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': 'Failed to load CV', 'detail': str(e)}), 500

@app.route('/api/list', methods=['GET'])
def list_cvs():
    try:
        files = []
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith('.json'):
                files.append(filename)
                
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': 'Failed to list CVs', 'detail': str(e)}), 500

# ---------- Flask endpoints ----------
@app.route('/api/parse', methods=['POST'])
def parse_file():
    print("\n=== New Upload Request ===")
    print(f"Request files: {request.files}")
    
    if 'file' not in request.files:
        print("Error: No file part in the request")
        return jsonify({'error': 'no file provided'}), 400
        
    f = request.files['file']
    print(f"Received file: {f.filename}")
    
    if f.filename == '':
        print("Error: No selected file")
        return jsonify({'error': 'no file selected'}), 400
        
    filename = secure_filename(f.filename or 'uploaded')
    ext = filename.split('.')[-1].lower()
    print(f"File extension: {ext}")
    
    if ext not in ALLOWED:
        print(f"Error: Invalid file type: {ext}")
        return jsonify({'error': 'invalid file type'}), 400
        
    try:
        content = f.read()
        print(f"File size: {len(content)} bytes")
        text = ''
        
        if ext == 'pdf':
            print("Processing PDF file...")
            tmp = os.path.join(UPLOAD_DIR, filename)
            with open(tmp, 'wb') as fh:
                fh.write(content)
            text = extract_text(tmp)
            os.remove(tmp)
            print("PDF processing complete")
        elif ext == 'docx':
            print("Processing DOCX file...")
            text = text_from_docx_bytes(content)
            print("DOCX processing complete")
            
        print(f"Extracted text length: {len(text)} characters")
        jsonv = heuristics_to_json(text)
        print("Successfully parsed file")
        return jsonify(jsonv)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error processing file: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({
            'error': 'parsing failed', 
            'detail': str(e),
            'traceback': error_trace
        }), 500

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)