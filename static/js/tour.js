// Initialize the tour when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Function to initialize the tour
    function initTour() {
        // Make sure Shepherd is available
        if (typeof Shepherd === 'undefined') {
            console.error('Shepherd.js is not loaded');
            return null;
        }

        // Create a new tour instance
        const tour = new Shepherd.Tour({
            useModalOverlay: false,
            defaultStepOptions: {
                cancelIcon: { enabled: true },
                classes: 'shepherd-theme-arrows',
                scrollTo: { behavior: 'smooth', block: 'center' },
                modalOverlayOpeningPadding: 0,
                canClickTarget: true,
                highlightClass: 'tour-highlight',
                arrow: true,
                popperOptions: {
                    strategy: 'fixed',
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 10],
                            },
                        },
                        {
                            name: 'preventOverflow',
                            options: {
                                boundary: document.body,
                                altAxis: true,
                                tether: false,
                            },
                        },
                    ],
                },
            },
            exitOnEsc: true,
            keyboardNavigation: true
        });
        
        // Make sure the tour doesn't prevent interactions
        document.addEventListener('click', (e) => {
            if (e.target.closest && !e.target.closest('.shepherd-element')) {
                // Allow all clicks outside the tour
                return true;
            }
        }, true);

        // Step 1: Welcome with choice
        tour.addStep({
            id: 'welcome',
            text: 'Welcome to CV Re-formatter! This tour will guide you through creating your CV.',
            buttons: [
                {
                    text: 'Start Tour',
                    action: function() {
                        // Make sure the first tab is active
                        const firstTab = document.querySelector('.tab-button[data-tab="upload"]');
                        if (firstTab) firstTab.click();
                        tour.next();
                    },
                    classes: 'shepherd-button-primary'
                }
            ]
        });

        // Step 2: Upload CV (Optional)
        tour.addStep({
            id: 'upload',
            title: 'Upload CV (Optional)',
            text: 'You can upload an existing CV file (PDF, DOCX, or TXT) to import your information, or click Next to create a new CV from scratch.',
            attachTo: {
                element: '#uploadBtn',
                on: 'bottom'
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 3: Personal Information
        tour.addStep({
            id: 'personal-info',
            title: 'Personal Information',
            text: 'Enter your personal details like name, email, and contact information here.',
            attachTo: {
                element: '#name',
                on: 'bottom'
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 4: Experience Section
        tour.addStep({
            id: 'experience',
            title: 'Work Experience',
            text: 'Add your work history. Include your job titles, companies, and key responsibilities.',
            attachTo: {
                element: '#experienceTab_1',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return new Promise((resolve) => {
                    const experienceTab = document.querySelector('[data-tab="experience"]');
                    if (experienceTab && !experienceTab.classList.contains('active')) {
                        experienceTab.click();
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(resolve, 100);
                });
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 5: Education Section
        tour.addStep({
            id: 'education',
            title: 'Education',
            text: 'Add your educational background. Include your degrees, institutions, and graduation years.',
            attachTo: {
                element: '#educationTab_1',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return new Promise((resolve) => {
                    const educationTab = document.querySelector('[data-tab="education"]');
                    if (educationTab && !educationTab.classList.contains('active')) {
                        educationTab.click();
                    }
                    setTimeout(resolve, 100);
                });
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 6: Skills Section
        tour.addStep({
            id: 'skills',
            title: 'Skills',
            text: 'List your key skills. These will be displayed as tags on your CV. Include both technical and soft skills.',
            attachTo: {
                element: '#skillstab_1',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return new Promise((resolve) => {
                    const skillsTab = document.querySelector('[data-tab="skills"]');
                    if (skillsTab && !skillsTab.classList.contains('active')) {
                        skillsTab.click();
                    }
                    setTimeout(resolve, 100);
                });
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 7: References Section
        tour.addStep({
            id: 'references',
            title: 'References',
            text: 'Add professional references if needed. Include their name, position, company, and contact information.',
            attachTo: {
                element: '#referencesTab_1',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return new Promise((resolve) => {
                    const refTab = document.querySelector('[data-tab="references"]');
                    if (refTab && !refTab.classList.contains('active')) {
                        refTab.click();
                    }
                    setTimeout(resolve, 100);
                });
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 8: Additional Sections
        tour.addStep({
            id: 'additional',
            title: 'Additional Sections',
            text: 'You can add more sections like certifications, projects, or languages using the "Add Section" button.',
            attachTo: {
                element: '#customTab_1',
                on: 'top'
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Step 9: Template Selection
        tour.addStep({
            id: 'select-template',
            title: 'Choose a Template',
            text: 'Select a professional template that best fits your style. You can preview and switch between different designs.',
            attachTo: {
                element: '#templateList',
                on: 'bottom'
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        // Final Step: Preview & Download
        const finalStep = {
            id: 'preview',
            title: 'Preview & Download',
            text: 'Preview your CV in real-time. When you\'re happy, download it as a PDF or save your progress. This is the end of the tour!',
            attachTo: {
                element: '#previewBtn',
                on: 'top'
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Finish',
                    action: function() {
                        // Complete the tour first
                        tour.complete();
                        // Then show celebration
                        createCelebration();
                    },
                    classes: 'shepherd-button-primary'
                }
            ]
        };
        
        // Add the final step
        tour.addStep(finalStep);

        return tour;
    }

    function createCelebration() {
        if (typeof confetti === 'undefined') return;
        
        const duration = 3 * 1000;
        const end = Date.now() + duration;
        const colors = ['#ff0000', '#ff7300', '#fffb00', '#48ff00', '#00ffd5', '#002bff', '#7a00ff', '#ff00c8', '#ff0000'];

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });

            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    // Initialize the tour
    const tour = initTour();
    
    // Remove the auto-start timeout to prevent conflicts
    const autoStartTimeout = setTimeout(() => {
        if (tour && !tour.isActive()) {
            tour.start();
        }
    }, 1000);
    
    // Clean up timeout when the tour is completed
    if (tour) {
        tour.on('complete', () => {
            clearTimeout(autoStartTimeout);
            createCelebration();
        });
        
        tour.on('cancel', () => {
            clearTimeout(autoStartTimeout);
        });
    }
    
    // Add click handler for the tour button
    const startTourButton = document.getElementById('startTour');
    if (startTourButton) {
        startTourButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (tour) {
                tour.start();
            }
        });
    }
    
    // Start tour automatically on every visit
    setTimeout(() => {
        if (tour) {
            tour.start();
        }
    }, 1000);
});
