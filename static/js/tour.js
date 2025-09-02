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
            text: 'Welcome to CV Re-formatter! Would you like to upload an existing CV or create a new one from scratch?',
            buttons: [
                {
                    text: 'Upload CV',
                    action: function() {
                        window.userChoice = 'upload';
                        tour.show('upload');
                    },
                    classes: 'shepherd-button-primary'
                },
                {
                    text: 'Create New',
                    action: function() {
                        window.userChoice = 'create';
                        tour.show('personal-info');
                    },
                    classes: 'shepherd-button-secondary'
                }
            ]
        });

        // Step 2: Upload CV (only shown if user chooses to upload)
        tour.addStep({
            id: 'upload',
            title: 'Upload Your CV',
            text: 'Click the "Upload CV" button to select your existing CV file (PDF, DOCX, or TXT). We\'ll help you import your information.',
            attachTo: {
                element: '#uploadBtn',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return window.userChoice === 'upload' ? Promise.resolve() : Promise.reject('skip');
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: function() {
                        tour.show('review-upload');
                    }
                }
            ]
        });

        // Step 3: Review Uploaded CV
        tour.addStep({
            id: 'review-upload',
            title: 'Review Your CV',
            text: 'We\'ve imported your CV! Please review the information and make any necessary updates.',
            attachTo: {
                element: '#personalInfo',
                on: 'bottom'
            },
            beforeShowPromise: function() {
                return window.userChoice === 'upload' ? Promise.resolve() : Promise.reject('skip');
            },
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Continue to Preview',
                    action: function() {
                        tour.show('preview');
                    }
                }
            ]
        });

        // Step 4: Personal Information
        const personalInfoText = window.userChoice === 'upload' 
            ? 'Let\'s verify your personal information. Check that everything looks correct and make any updates needed.'
            : 'Let\'s start by filling in your personal information. This will appear at the top of your CV.';

        tour.addStep({
            id: 'personal-info',
            title: 'Personal Information',
            text: personalInfoText,
            attachTo: {
                element: '#personalInfo',
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

        // Step 5: Experience Section
        tour.addStep({
            id: 'experience',
            title: 'Work Experience',
            text: 'Add your work history. Click the + button to add multiple positions.',
            attachTo: {
                element: '#experience-tab',
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

        // Step 6: Education Section
        tour.addStep({
            id: 'education',
            title: 'Education',
            text: 'Add your educational background. Include your degrees and certifications here.',
            attachTo: {
                element: '#education-tab',
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

        // Step 7: Skills Section
        tour.addStep({
            id: 'skills',
            title: 'Skills',
            text: 'List your key skills. These will be displayed as tags on your CV.',
            attachTo: {
                element: '#skills-tab',
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

        // Step 8: Preview & Download
        tour.addStep({
            id: 'preview',
            title: 'Preview & Download',
            text: 'Preview your CV in real-time. When you\'re happy, download it as a PDF or save your progress.',
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
                    action: tour.complete
                }
            ]
        });

        return tour;
    }

    // Initialize the tour
    const tour = initTour();
    
    // Add click handler for the tour button
    const startTourButton = document.getElementById('startTour');
    if (startTourButton) {
        startTourButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (tour) {
                tour.cancel();
                tour.start();
            }
        });
    }
    
    // Function to create celebration effect
    function createCelebration() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.fontSize = '3rem';
        container.style.animation = 'fadeOut 3s forwards';
        
        const emojis = ['🎉', '✨', '👏', '🥳', '🎊', '🌟', '💫', '🎈'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        container.textContent = emoji.repeat(5) + ' Yay! ' + emoji.repeat(5);
        document.body.appendChild(container);
        
        // Remove after animation
        setTimeout(() => {
            container.remove();
        }, 3000);
    }
    
    // Add celebration to the last step
    const lastStep = tour.steps[tour.steps.length - 1];
    const originalComplete = lastStep.options.buttons[1].action;
    lastStep.options.buttons[1].action = function() {
        // First complete the tour
        originalComplete.call(this);
        // Then show celebration
        createCelebration();
    };
    
    // Start tour automatically on every visit
    setTimeout(() => {
        if (tour) {
            tour.start();
        }
    }, 1000);
});
