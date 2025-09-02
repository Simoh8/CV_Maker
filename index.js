const $ = id => document.getElementById(id);
const parseJSONorEmpty = s => { try {return JSON.parse(s)} catch {return []} }
let activeTemplate = 'a';

// M-Pesa Donation Modal
const modal = document.getElementById('mpesaModal');
const openModalBtn = document.getElementById('openDonateModal');
const closeModalBtn = document.querySelector('.close');
const donationForm = document.getElementById('donationForm');
const statusMessage = document.getElementById('donationStatus');

// Open modal when donate button is clicked
if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    });
}

// Close modal when X is clicked
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        closeModal();
    });
}

// Close modal when clicking outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Handle form submission
if (donationForm) {
    donationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const phoneNumber = document.getElementById('phoneNumber').value;
        const amount = document.getElementById('amount').value;
        
        // Validate phone number (Kenyan format: 7XXXXXXXX)
        if (!/^[0-9]{9}$/.test(phoneNumber)) {
            showStatus('Please enter a valid M-Pesa number (e.g., 712345678)', 'error');
            return;
        }
        
        // Format phone number (add 254 and remove leading 0 if any)
        const formattedPhone = `254${phoneNumber}`;
        
        // Show loading state
        const submitBtn = document.getElementById('stkPushBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            // In a real implementation, you would make an API call to your backend
            // which would then call the M-Pesa STK Push API
            const response = await simulateStkPush(formattedPhone, amount);
            
            if (response.success) {
                showStatus('Payment request sent to your phone. Please check your M-Pesa menu to complete the payment.', 'success');
                // Clear form and close modal after 5 seconds
                setTimeout(() => {
                    donationForm.reset();
                    closeModal();
                }, 5000);
            } else {
                throw new Error(response.message || 'Failed to initiate payment');
            }
        } catch (error) {
            console.error('Payment error:', error);
            showStatus(error.message || 'An error occurred while processing your payment. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

// Simulate STK Push (replace with actual API call to your backend)
async function simulateStkPush(phoneNumber, amount) {
    try {
        const response = await fetch('/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: phoneNumber,
                amount: amount
            })
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Payment error:', error);
        return {
            success: false,
            message: 'Failed to connect to payment service'
        };
    }
}

function showStatus(message, type = 'info') {
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 5000);
    }
}

function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // Reset status message when closing modal
        if (statusMessage) {
            statusMessage.className = 'status-message';
            statusMessage.textContent = '';
        }
    }, 300); // Match this with the CSS transition duration
}

// Initialize tab functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and content in the same tab group
        const tabGroup = button.closest('.tab-buttons');
        if (tabGroup) {
            tabGroup.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            const contentId = button.getAttribute('data-tab') + '-tab';
            const contentGroup = document.querySelector(`#${contentId}`)?.closest('.tab-container');
            if (contentGroup) {
                contentGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            }
        }
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        const content = document.getElementById(`${tabId}-tab`);
        if (content) {
            content.classList.add('active');
            
            // Initialize content if it's the references tab and empty
            if (tabId === 'references' && $('referenceEntries').children.length === 0) {
                $('addReference').click();
            }
        }
    });
});

// File upload handling
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');

// Make sure elements exist before adding event listeners
if (fileUploadArea && fileInput && fileName && uploadBtn) {
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.style.borderColor = 'var(--accent)';
        fileUploadArea.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.style.borderColor = 'var(--input-border)';
        fileUploadArea.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadArea.style.borderColor = 'var(--input-border)';
        fileUploadArea.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            updateFileName();
        }
    });

    fileInput.addEventListener('change', updateFileName);
} else {
    console.error('One or more file upload elements not found');
}

function updateFileName() {
    if (!fileInput || !fileName) return;
    
    if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileName.textContent = file.name;
        fileUploadArea.style.borderColor = 'var(--success)';
        
        // Validate file type
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'pdf' && ext !== 'docx') {
            showNotification('Only PDF and DOCX files are allowed', false);
            fileUploadArea.style.borderColor = 'var(--error)';
        }
    } else {
        fileName.textContent = 'No file selected';
        fileUploadArea.style.borderColor = 'var(--input-border)';
    }
}

// Notification system
function showNotification(message, isSuccess = true) {
    const notification = $('#notification');
    const icon = notification.querySelector('i');
    const messageEl = $('#notificationMessage');
    
    messageEl.textContent = message;
    
    notification.className = 'notification';
    notification.classList.add(isSuccess ? 'success' : 'error');
    icon.className = isSuccess ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

$('accentColor').addEventListener('input', e => {
    document.documentElement.style.setProperty('--accent', e.target.value);
    updatePreview();
});

document.querySelectorAll('.template-item').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.template-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active'); 
        activeTemplate = el.dataset.template; 
        updatePreview();
    });
});

// Experience entry management
$('addExperience').addEventListener('click', () => {
    const entryId = Date.now();
    const entryHtml = `
        <div class="entry-item" id="exp-${entryId}">
            <h4><i class="fas fa-briefcase"></i> Experience Entry</h4>
            <input type="text" placeholder="Job Title" class="exp-role">
            <input type="text" placeholder="Company" class="exp-company">
            <input type="text" placeholder="Years (e.g., 2020-2022)" class="exp-years">
            <textarea placeholder="Description" class="exp-description"></textarea>
            <div class="entry-controls">
                <button class="small btn-ghost" onclick="removeEntry('exp-${entryId}')">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            </div>
        </div>
    `;
    $('experienceEntries').insertAdjacentHTML('beforeend', entryHtml);
});

// Education entry management
$('addEducation').addEventListener('click', () => {
    const entryId = Date.now();
    const entryHtml = `
        <div class="entry-item" id="edu-${entryId}">
            <h4><i class="fas fa-graduation-cap"></i> Education Entry</h4>
            <input type="text" placeholder="Degree" class="edu-degree">
            <input type="text" placeholder="School/Institution" class="edu-school">
            <input type="text" placeholder="Years (e.g., 2016-2020)" class="edu-years">
            <div class="entry-controls">
                <button class="small btn-ghost" onclick="removeEntry('edu-${entryId}')">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            </div>
        </div>
    `;
    $('educationEntries').insertAdjacentHTML('beforeend', entryHtml);
});

// Custom section management
$('addCustomSection').addEventListener('click', () => {
    const entryId = Date.now();
    const entryHtml = `
        <div class="entry-item" id="custom-${entryId}">
            <h4><i class="fas fa-plus-circle"></i> Custom Section</h4>
            <input type="text" placeholder="Section Title" class="custom-title">
            <textarea placeholder="Content (one item per line)" class="custom-content"></textarea>
            <div class="entry-controls">
                <button class="small btn-ghost" onclick="removeEntry('custom-${entryId}')">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            </div>
        </div>
    `;
    $('customEntries').insertAdjacentHTML('beforeend', entryHtml);
});


// Reference entry management
$('addReference').addEventListener('click', () => {
    const entryId = Date.now();
    const entryHtml = `
        <div class="entry-item" id="ref-${entryId}">
            <h4><i class="fas fa-user-friends"></i> Reference Entry</h4>
            <input type="text" placeholder="Name" class="ref-name">
            <input type="text" placeholder="Position" class="ref-position">
            <input type="text" placeholder="Company" class="ref-company">
            <input type="email" placeholder="Email" class="ref-email">
            <input type="tel" placeholder="Phone" class="ref-phone">
            <div class="entry-controls">
                <button class="small btn-ghost" onclick="removeEntry('ref-${entryId}')">
                    <i class="fas fa-trash"></i>
                    Remove
                </button>
            </div>
        </div>
    `;
    $('referenceEntries').insertAdjacentHTML('beforeend', entryHtml);
    
    // Add input event listeners to the new reference entry
    const newEntry = document.getElementById(`ref-${entryId}`);
    newEntry.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updatePreview);
    });
});

// Remove entry function
function removeEntry(id) {
    $(id).remove();
    updatePreview();
}

// Upload functionality
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const f = fileInput.files[0];
    
    if (!f) {
        showNotification('Please select a file first', false);
        return;
    }
    
    const form = new FormData();
    form.append('file', f);
    
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Parsing...';
    
    try {
        const res = await fetch('/api/parse', {
            method: 'POST',
            body: form
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        // Use setTimeout to ensure DOM is updated before updating preview
        setTimeout(() => {
            fillFormFromJson(json);
            // Small delay to ensure all DOM updates are complete
            setTimeout(updatePreview, 100);
        }, 0);
        
        // Switch to create tab after successful upload
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="create"]').classList.add('active');
        document.getElementById('create-tab').classList.add('active');
        
        showNotification('CV parsed successfully! You can now edit it.', true);
        
    } catch (err) {
        console.error('Upload error:', err);
        showNotification(`Error: ${err.message || 'Failed to parse file. Please try again.'}`, false);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-paragraph"></i> Parse CV';
    }
});

$('clearBtn').addEventListener('click', () => {
    // Clear all form fields
    ['name', 'title', 'email', 'phone', 'github', 'linkedin', 'skills', 'softskills', 'languages', 'references'].forEach(id => {
        $(id).value = '';
    });
    
    // Clear dynamic entries
    ['experienceEntries', 'educationEntries', 'customEntries'].forEach(id => {
        $(id).innerHTML = '';
    });
    
    // Reset file input
    fileInput.value = '';
    updateFileName();
    
    updatePreview();
    showNotification('Form cleared', true);
});

// Add html2pdf library
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
script.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBp+5qe0r3yB9qUdxw0x8f0qCw3I5Y2d1d5f3F1tQ==';
script.crossOrigin = 'anonymous';
script.referrerPolicy = 'no-referrer';
document.head.appendChild(script);

// Preview button handler
$('previewBtn').addEventListener('click', () => {
    updatePreview();
    showNotification('Preview updated', true);
});

// Download as PDF functionality using browser's print
function handlePdfDownload() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', () => {
        const previewArea = document.getElementById('previewArea');
        if (!previewArea) {
            showNotification('Preview content not found', false);
            return;
        }

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showNotification('Could not open print window. Please allow popups for this site.', false);
            return;
        }

        // Get the preview content
        const previewContent = previewArea.innerHTML;
        
        // Get all styles from the main document
        const styles = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules || [])
                        .map(rule => rule.cssText)
                        .join('\n');
                } catch (e) {
                    return '';
                }
            })
            .join('\n');

        // Create the print document
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CV - Print</title>
                <meta charset="utf-8">
                <style>
                    /* Include all original styles */
                    ${styles}
                    
                    /* Print-specific overrides */
                    @page { 
                        size: A4;
                        margin: 0;
                    }
                    
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    
                    #previewArea {
                        width: 100% !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        box-sizing: border-box;
                        background: white !important;
                        box-shadow: none !important;
                        position: relative;
                        left: 0 !important;
                        top: 0 !important;
                        transform: none !important;
                    }
                    
                    /* Ensure all text is black for printing */
                    * {
                        color: inherit !important;
                    }
                    
                    /* Ensure the CV paper takes full page */
                    .cv-paper {
                        width: 100% !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 20mm !important;
                        box-sizing: border-box;
                        background: white !important;
                        box-shadow: none !important;
                    }
                    
                    /* Fix any elements that might be hidden */
                    .cv-paper * {
                        visibility: visible !important;
                    }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="cv-paper">${previewContent}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
}

// Initialize PDF download when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePdfDownload);
} else {
    handlePdfDownload();
}

// Add print styles
const style = document.createElement('style');
style.textContent = `
    @media print {
        body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
        }
        
        .cv-paper {
            box-shadow: none;
            margin: 0;
            padding: 15mm;
            width: auto;
            min-height: auto;
            page-break-inside: avoid;
        }
        
        .skill-pill {
            border: 1px solid #0f172a !important;
        }
        
        .section-title-cv {
            color: #7c3aed !important;
            border-bottom: 2px solid #7c3aed !important;
        }
        
        .cv-title, .muted-dark {
            color: #475569 !important;
        }
        
        .minimal-header {
            border-left: 6px solid #7c3aed !important;
        }
    }
    
    .cv-title {
        color: #475569;
        margin-top: 5px;
        font-weight: 600;
        font-size: 16px;
    }
    
    .two-col {
        display: flex;
        gap: 20px;
    }
    
    .left-col {
        width: 35%;
    }
    
    .right-col {
        width: 65%;
    }
    
    .skill-pill {
        display: inline-block;
        padding: 6px 12px;
        background: #f8fafc;
        border-radius: 999px;
        border: 1px solid #e2e8f0;
        margin: 4px 6px 4px 0;
        font-size: 12px;
        color: #1e293b;
    }
                
    .minimal-header {
        border-left: 6px solid #7c3aed;
        padding-left: 15px;
        margin-bottom: 20px;
    }
    
    @media print {
        body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
        }
        
        .cv-paper {
            box-shadow: none;
            margin: 0;
            padding: 15mm;
            width: auto;
            min-height: auto;
            page-break-inside: avoid;
        }
        
        .skill-pill {
            border: 1px solid #0f172a !important;
        }
        
        .section-title-cv {
            color: #7c3aed !important;
            border-bottom: 2px solid #7c3aed !important;
        }
        
        .cv-title, .muted-dark {
            color: #475569 !important;
        }
        
        .minimal-header {
            border-left: 6px solid #7c3aed !important;
        }
    }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 100);
                };
            <\/script>
        </body>
        </html>
    `
    
    printWindow.document.close();
    showNotification('Preparing download...', true);


$('saveBtn').addEventListener('click', () => {
    const data = gatherData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cv-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('CV saved as JSON', true);
});

function fillFormFromJson(json) {
    // Fill personal info
    $('name').value = json.personal?.name || '';
    $('title').value = json.personal?.title || '';
    $('email').value = json.personal?.email || '';
    $('phone').value = json.personal?.phone || '';
    $('github').value = json.personal?.github || '';
    $('linkedin').value = json.personal?.linkedin || '';
    
    // Trigger input events to update any listeners
    ['name', 'title', 'email', 'phone', 'github', 'linkedin'].forEach(id => {
        const event = new Event('input', { bubbles: true });
        $(id).dispatchEvent(event);
    });
    
    // Fill experience
    $('experienceEntries').innerHTML = '';
    if (json.experience && json.experience.length) {
        json.experience.forEach(exp => {
            const entryId = Date.now();
            const entryHtml = `
                <div class="entry-item" id="exp-${entryId}">
                    <h4><i class="fas fa-briefcase"></i> Experience Entry</h4>
                    <input type="text" placeholder="Job Title" class="exp-role" value="${exp.role || ''}">
                    <input type="text" placeholder="Company" class="exp-company" value="${exp.company || ''}">
                    <input type="text" placeholder="Years" class="exp-years" value="${exp.years || ''}">
                    <textarea placeholder="Description" class="exp-description">${exp.description || ''}</textarea>
                    <div class="entry-controls">
                        <button class="small btn-ghost" onclick="removeEntry('exp-${entryId}')">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                    </div>
                </div>
            `;
            $('experienceEntries').insertAdjacentHTML('beforeend', entryHtml);
            // Add event listeners to the new inputs
            const expItem = $('experienceEntries').lastElementChild;
            const expInputs = expItem.querySelectorAll('input, textarea');
            expInputs.forEach(input => {
                input.addEventListener('input', updatePreview);
                // Trigger input event to update preview
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        });
    }
    
    // Fill education
    $('educationEntries').innerHTML = '';
    if (json.education && json.education.length) {
        json.education.forEach(edu => {
            const entryId = Date.now();
            const entryHtml = `
                <div class="entry-item" id="edu-${entryId}">
                    <h4><i class="fas fa-graduation-cap"></i> Education Entry</h4>
                    <input type="text" placeholder="Degree" class="edu-degree" value="${edu.degree || ''}">
                    <input type="text" placeholder="School/Institution" class="edu-school" value="${edu.school || ''}">
                    <input type="text" placeholder="Years" class="edu-years" value="${edu.years || ''}">
                    <div class="entry-controls">
                        <button class="small btn-ghost" onclick="removeEntry('edu-${entryId}')">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                    </div>
                </div>
            `;
            $('educationEntries').insertAdjacentHTML('beforeend', entryHtml);
            // Add event listeners to the new inputs
            const eduItem = $('educationEntries').lastElementChild;
            const eduInputs = eduItem.querySelectorAll('input');
            eduInputs.forEach(input => {
                input.addEventListener('input', updatePreview);
                // Trigger input event to update preview
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        });
    }
    
    // Fill skills and trigger input events
    const skillsInputs = {
        'skills': json.skills || [],
        'softskills': json.soft_skills || [],
        'languages': json.languages || []
    };
    
    Object.entries(skillsInputs).forEach(([id, value]) => {
        const element = $(id);
        if (element) {
            element.value = value.join(', ');
            const event = new Event('input', { bubbles: true });
            element.dispatchEvent(event);
        }
    });
    
    // Fill custom sections
    $('customEntries').innerHTML = '';
    if (json.custom_sections && json.custom_sections.length) {
        json.custom_sections.forEach(section => {
            const entryId = Date.now();
            const entryHtml = `
                <div class="entry-item" id="custom-${entryId}">
                    <h4><i class="fas fa-plus-circle"></i> Custom Section</h4>
                    <input type="text" placeholder="Section Title" class="custom-title" value="${section.title || ''}">
                    <textarea placeholder="Content (one item per line)" class="custom-content">${(section.content || []).join('\n')}</textarea>
                    <div class="entry-controls">
                        <button class="small btn-ghost" onclick="removeEntry('custom-${entryId}')">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                    </div>
                </div>
            `;
            $('customEntries').insertAdjacentHTML('beforeend', entryHtml);
            // Add event listeners to the new inputs
            const customItem = $('customEntries').lastElementChild;
            const customInputs = customItem.querySelectorAll('input, textarea');
            customInputs.forEach(input => {
                input.addEventListener('input', updatePreview);
                // Trigger input event to update preview
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            });
        });
    }
    

    $('referenceEntries').innerHTML = '';
    
    if (json.references && json.references.length) {
        json.references.forEach(ref => {
            if (ref.name) {  // Only add if there's a name
                // Add reference and trigger preview update
                const refEntry = addReferenceEntry({
                    name: ref.name || '',
                    position: ref.position || '',
                    company: ref.company || '',
                    phone: ref.phone || '',
                    email: ref.email || ''
                });
                
                if (refEntry) {
                    const refInputs = refEntry.querySelectorAll('input');
                    refInputs.forEach(input => {
                        const event = new Event('input', { bubbles: true });
                        input.dispatchEvent(event);
                    });
                }
            }
        });
    } else {
        // Add one empty reference if none exist
        addReferenceEntry();
    }
}

function gatherData() {
    // Gather experience from form inputs
    const experience = [];
    document.querySelectorAll('#experienceEntries .entry-item').forEach(item => {
        experience.push({
            role: item.querySelector('.exp-role').value,
            company: item.querySelector('.exp-company').value,
            years: item.querySelector('.exp-years').value,
            description: item.querySelector('.exp-description').value
        });
    });
    
    // Gather education from form inputs
    const education = [];
    document.querySelectorAll('#educationEntries .entry-item').forEach(item => {
        education.push({
            degree: item.querySelector('.edu-degree').value,
            school: item.querySelector('.edu-school').value,
            years: item.querySelector('.edu-years').value
        });
    });
    
    // Gather custom sections from form inputs
    const customSections = [];
    document.querySelectorAll('#customEntries .entry-item').forEach(item => {
        const content = item.querySelector('.custom-content').value.split('\n').filter(line => line.trim());
        customSections.push({
            title: item.querySelector('.custom-title').value,
            content: content
        });
    });
    
    // Gather references from input fields
    const references = [];
    document.querySelectorAll('#referenceEntries .entry-item').forEach(item => {
        const name = item.querySelector('.ref-name').value.trim();
        if (!name) return;
        
        references.push({
            name: name,
            position: item.querySelector('.ref-position').value.trim(),
            company: item.querySelector('.ref-company').value.trim(),
            phone: item.querySelector('.ref-phone').value.trim(),
            email: item.querySelector('.ref-email').value.trim()
        });
    });
    
    return {
        personal: {
            name: $('name').value,
            title: $('title').value,
            email: $('email').value,
            phone: $('phone').value,
            github: $('github').value,
            linkedin: $('linkedin').value
        },
        experience: experience,
        education: education,
        skills: $('skills').value.split(',').map(s => s.trim()).filter(Boolean),
        soft_skills: $('softskills').value.split(',').map(s => s.trim()).filter(Boolean),
        languages: $('languages').value.split(',').map(s => s.trim()).filter(Boolean),
        custom_sections: customSections,
        references: references
    };
}

function renderReferences(refs) {
    if (!refs || !refs.length) return '';
    
    const refsHtml = refs.map(ref => {
        const parts = [];
        if (ref.name) parts.push(`<strong style="color: inherit">${ref.name}</strong>`);
        if (ref.position) parts.push(`<span style="color: inherit">${ref.position}</span>`);
        if (ref.company) parts.push(`<span style="color: inherit">at ${ref.company}</span>`);
        
        const contact = [];
        if (ref.phone) contact.push(`<i class="fas fa-phone" style="color: var(--accent, #7c3aed)"></i> <span style="color: var(--muted, #94a3b8)">${ref.phone}</span>`);
        if (ref.email) contact.push(`<i class="fas fa-envelope" style="color: var(--accent, #7c3aed)"></i> <span style="color: var(--muted, #94a3b8)">${ref.email}</span>`);
        
        let referenceText = parts.join(', ');
        if (contact.length > 0) {
            referenceText += ` <span style="color: var(--muted, #94a3b8)">(${contact.join(' | ')})</span>`;
        }
        
        return `<div class="reference" style="color: var(--text-color, #1f2937)">${referenceText}</div>`;
    }).join('');
    
    if (!refsHtml) return '';
    
    return `
        <div class="section">
            <div class="section-title-cv">
                <i class="fas fa-user-friends"></i> References
            </div>
            <div class="references">
                ${refsHtml}
            </div>
        </div>
    `;
}

function renderTemplateA(d) {
    const exp = d.experience.map(e => 
        `<div><b>${e.role}</b> – ${e.company} <span class="muted-dark">${e.years}</span><div>${e.description || ''}</div></div>`
    ).join('');
    
    const edu = d.education.map(e => 
        `<div><b>${e.degree}</b> – ${e.school} <span class="muted-dark">${e.years}</span></div>`
    ).join('');
    
    const skills = (d.skills || []).map(s => `<span class="skill-pill">${s}</span>`).join('');
    const languages = (d.languages || []).map(l => `<span class="skill-pill">${l}</span>`).join('');
    
    const custom = (d.custom_sections || []).map(sec => 
        `<div class="section-title-cv">${sec.title}</div><ul>${sec.content.map(c => `<li>${c}</li>`).join('')}</ul>`
    ).join('');
    
    const refs = renderReferences(d.references || []);
    
    return `<div class="cv-paper"><div>
        <div class="cv-name">${d.personal.name}</div>
        <div class="cv-title">${d.personal.title}</div>
        <div class="muted-dark">${d.personal.email} · ${d.personal.phone}</div>
        <div class="muted-dark">${d.personal.github} ${d.personal.linkedin}</div>
        
        ${d.experience.length ? `<div class="section-title-cv">Experience</div>${exp}` : ''}
        ${d.education.length ? `<div class="section-title-cv">Education</div>${edu}` : ''}
        ${d.skills.length ? `<div class="section-title-cv">Technical Skills</div>${skills}` : ''}
        ${d.soft_skills.length ? `<div class="section-title-cv">Soft Skills</div>${d.soft_skills.join(', ')}` : ''}
        ${d.languages.length ? `<div class="section-title-cv">Languages</div>${languages}` : ''}
        ${custom}
        ${refs}
    </div></div>`;
}

function renderTemplateB(d) {
    const skills = (d.skills || []).map(s => `<div>${s}</div>`).join('');
    const languages = (d.languages || []).map(l => `<div>${l}</div>`).join('');
    
    const exp = d.experience.map(e => 
        `<div><b>${e.role}</b><div>${e.company} – ${e.years}</div><div>${e.description}</div></div>`
    ).join('');
    
    const edu = d.education.map(e => 
        `<div><b>${e.degree}</b> – ${e.school} (${e.years})</div>`
    ).join('');
    
    const custom = (d.custom_sections || []).map(sec => 
        `<div class="section-title-cv">${sec.title}</div><ul>${sec.content.map(c => `<li>${c}</li>`).join('')}</ul>`
    ).join('');
    
    const refs = renderReferences(d.references || []);
    
    return `<div class="cv-paper"><div class="two-col">
        <div class="left-col">
            <b class="cv-name">${d.personal.name}</b>
            <div class="cv-title">${d.personal.title}</div>
            <div class="muted-dark">${d.personal.email}</div>
            <div class="muted-dark">${d.personal.phone}</div>
            <div class="muted-dark">${d.personal.github}</div>
            <div class="muted-dark">${d.personal.linkedin}</div>
            
            ${d.skills.length ? `<div class="section-title-cv">Technical Skills</div>${skills}` : ''}
            ${d.soft_skills.length ? `<div class="section-title-cv">Soft Skills</div>${d.soft_skills.join(', ')}` : ''}
            ${d.languages.length ? `<div class="section-title-cv">Languages</div>${languages}` : ''}
        </div>
        
        <div class="right-col">
            ${d.experience.length ? `<div class="section-title-cv">Experience</div>${exp}` : ''}
            ${d.education.length ? `<div class="section-title-cv">Education</div>${edu}` : ''}
            ${custom}
            ${refs}
        </div>
    </div></div>`;
}

function renderTemplateC(d) {
    const exp = d.experience.map(e => 
        `<div><b>${e.role}</b> – ${e.company}<div>${e.years}</div><div>${e.description}</div></div>`
    ).join('');
    
    const edu = d.education.map(e => 
        `<div><b>${e.degree}</b> – ${e.school} (${e.years})</div>`
    ).join('');
    
    const custom = (d.custom_sections || []).map(sec => 
        `<div class="section-title-cv">${sec.title}</div><ul>${sec.content.map(c => `<li>${c}</li>`).join('')}</ul>`
    ).join('');
    
    const refs = renderReferences(d.references || []);
    
    return `<div class="cv-paper"><div class="minimal-header">
        <div class="cv-name">${d.personal.name}</div>
        <div class="cv-title">${d.personal.title}</div>
        <div class="muted-dark">${d.personal.email} · ${d.personal.phone}</div>
    </div>
    
    ${d.experience.length ? `<div class="section-title-cv">Experience</div>${exp}` : ''}
    ${d.education.length ? `<div class="section-title-cv">Education</div>${edu}` : ''}
    
    <div class="two-col">
        <div>
            ${d.skills.length ? `<div class="section-title-cv">Technical Skills</div>${d.skills.join(', ')}` : ''}
        </div>
        <div>
            ${d.soft_skills.length ? `<div class="section-title-cv">Soft Skills</div>${d.soft_skills.join(', ')}` : ''}
            ${d.languages.length ? `<div class="section-title-cv">Languages</div>${d.languages.join(', ')}` : ''}
        </div>
    </div>
    
    ${custom}
    ${refs}
    </div></div>`;
}

function renderTemplateD(d) {
    const exp = d.experience.map(e => 
        `<div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between;">
                <b>${e.role}</b>
                <span class="muted-dark">${e.years}</span>
            </div>
            <div class="muted-dark">${e.company}</div>
            <div>${e.description || ''}</div>
        </div>`
    ).join('');
    
    const edu = d.education.map(e => 
        `<div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
                <b>${e.degree}</b>
                <span class="muted-dark">${e.years}</span>
            </div>
            <div class="muted-dark">${e.school}</div>
        </div>`
    ).join('');
    
    const skills = (d.skills || []).map(s => `<span class="skill-pill">${s}</span>`).join('');
    const languages = (d.languages || []).map(l => `<span class="skill-pill">${l}</span>`).join('');
    
    const custom = (d.custom_sections || []).map(sec => 
        `<div class="section-title-cv">${sec.title}</div><ul>${sec.content.map(c => `<li>${c}</li>`).join('')}</ul>`
    ).join('');
    
    const refs = renderReferences(d.references || []);
    
    return `<div class="cv-paper">
        <div style="text-align: center; margin-bottom: 25px;">
            <div class="cv-name">${d.personal.name}</div>
            <div class="cv-title">${d.personal.title}</div>
            <div class="muted-dark">${d.personal.email} · ${d.personal.phone} · ${d.personal.github} · ${d.personal.linkedin}</div>
        </div>
        
        <div class="two-col">
            <div class="left-col">
                ${d.experience.length ? `<div class="section-title-cv">Experience</div>${exp}` : ''}
                ${d.education.length ? `<div class="section-title-cv">Education</div>${edu}` : ''}
            </div>
            
            <div class="right-col">
                ${d.skills.length ? `<div class="section-title-cv">Technical Skills</div>${skills}` : ''}
                ${d.soft_skills.length ? `<div class="section-title-cv">Soft Skills</div>${d.soft_skills.join(', ')}` : ''}
                ${d.languages.length ? `<div class="section-title-cv">Languages</div>${languages}` : ''}
                ${custom}
                ${refs}
            </div>
        </div>
    </div>`;
}

function updatePreview() {
    const d = gatherData();
    let html = '';
    
    if (activeTemplate === 'a') {
        html = renderTemplateA(d);
    } else if (activeTemplate === 'b') {
        html = renderTemplateB(d);
    } else if (activeTemplate === 'c') {
        html = renderTemplateC(d);
    } else {
        html = renderTemplateD(d);
    }
    
    $('previewArea').innerHTML = html;
}



// Add a default reference when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add one empty reference by default if in the references tab
    const referencesTab = document.querySelector('.tab-button[data-tab="references"]');
    if (referencesTab && $('referenceEntries').children.length === 0) {
        $('addReference').click();
    }
});

// Initialize with empty form
updatePreview();

// Add some sample data for demo purposes
setTimeout(() => {
    if (!$('name').value) {
        $('name').value = 'John Doe';
        $('title').value = 'Senior Software Engineer';
        $('email').value = 'john.doe@example.com';
        $('phone').value = '+1 (555) 123-4567';
        $('github').value = 'https://github.com/johndoe';
        $('linkedin').value = 'https://linkedin.com/in/johndoe';
        $('skills').value = 'JavaScript, Python, React, Node.js, SQL';
        $('softskills').value = 'Communication, Teamwork, Problem-solving';
        $('languages').value = 'English, Spanish';
        updatePreview();
    }
}, 1000);



const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/parse', upload.single('file'), async (req, res) => {
try {
if (!req.file) {
return res.status(400).json({ error: 'No file uploaded' });
}

let text = '';

if (req.file.mimetype === 'application/pdf') {
const data = await pdfParse(req.file.buffer);
text = data.text;
} else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
const result = await mammoth.extractRawText({ buffer: req.file.buffer });
text = result.value;
} else {
return res.status(400).json({ error: 'Unsupported file type' });
}

// Parse the text to extract structured data
const parsedData = parseCVText(text);

res.json(parsedData);
} catch (error) {
console.error('Error parsing file:', error);
res.status(500).json({ error: 'Failed to parse file' });
}
});

function parseCVText(text) {
// This is a simplified example - real implementation would be more complex
const lines = text.split('\n');

// Basic parsing logic (would need to be much more sophisticated)
const personal = {
name: lines[0] || '',
email: lines.find(line => line.includes('@')) || '',
phone: lines.find(line => /[\d\-\(\)]+/.test(line)) || ''
};

return {
personal,
experience: [],
education: [],
skills: [],
soft_skills: [],
languages: [],
custom_sections: [],
references: []
};
}

app.listen(3000, () => console.log('Server running on port 3000'));
