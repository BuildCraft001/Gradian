document.addEventListener('DOMContentLoaded', () => {
    const subjectsContainer = document.getElementById('subjects-container');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const subjectTemplate = document.getElementById('subject-template');
    const gradeTemplate = document.getElementById('grade-template');

    const modal = document.getElementById('input-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalInputText = document.getElementById('modal-input-text');
    const modalInputGrade = document.getElementById('modal-input-grade');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalCloseBtn = document.querySelector('.modal-close-btn');

    const overallAverageValueDisplay = document.getElementById('overall-average-value');

    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    let currentModalAction = null;
    let currentElementContext = null;

    // --- THEME TOGGLE ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gradian-theme', theme);
    };

    const storedTheme = localStorage.getItem('gradian-theme');
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const currentTheme = storedTheme || preferredTheme;
    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // --- MODAL FUNCTIONS ---
    function openModal(action, context = null, defaultValue = '') {
        currentModalAction = action;
        currentElementContext = context;
        modal.classList.add('active');

        modalInputText.style.display = 'none';
        modalInputGrade.style.display = 'none';

        switch (action) {
            case 'addSubject':
                modalTitle.textContent = 'Neues Fach hinzufügen';
                modalInputText.style.display = 'block';
                modalInputText.value = '';
                modalInputText.placeholder = 'Name des Fachs';
                modalInputText.focus();
                break;
            case 'editSubjectName':
                modalTitle.textContent = 'Fach umbenennen';
                modalInputText.style.display = 'block';
                modalInputText.value = defaultValue;
                modalInputText.placeholder = 'Name des Fachs';
                modalInputText.select(); // Select text for easy replacement
                break;
            case 'addGrade':
                modalTitle.textContent = `Note hinzufügen (${context.querySelector('.category-title').textContent})`;
                modalInputGrade.style.display = 'block';
                modalInputGrade.value = '';
                modalInputGrade.placeholder = 'Note (1-6)';
                modalInputGrade.focus();
                break;
            case 'editGrade':
                modalTitle.textContent = `Note bearbeiten`;
                modalInputGrade.style.display = 'block';
                modalInputGrade.value = defaultValue;
                modalInputGrade.select(); // Select text for easy replacement
                break;
        }
    }

    function closeModal() {
        modal.classList.remove('active');
        currentModalAction = null;
        currentElementContext = null;
        // Clear inputs to avoid old values flashing on next open
        modalInputText.value = '';
        modalInputGrade.value = '';
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && modal.classList.contains('active')) {
            closeModal();
        }
    });

    modalConfirmBtn.addEventListener('click', () => {
        if (!currentModalAction) return;
        let needsOverallRecalculation = false;

        if (currentModalAction === 'addSubject') {
            const subjectName = modalInputText.value.trim();
            if (subjectName) {
                addSubject(subjectName);
                needsOverallRecalculation = true;
            }
        } else if (currentModalAction === 'editSubjectName') {
            const newName = modalInputText.value.trim();
            if (newName && currentElementContext) {
                currentElementContext.querySelector('.subject-name').textContent = newName;
            }
        } else if (currentModalAction === 'addGrade') {
            const gradeValue = parseInt(modalInputGrade.value);
            if (!isNaN(gradeValue) && gradeValue >= 1 && gradeValue <= 6 && currentElementContext) {
                addGradeToCategory(currentElementContext, gradeValue);
                needsOverallRecalculation = true;
            }
        } else if (currentModalAction === 'editGrade') {
            const gradeValueStr = modalInputGrade.value.trim();
            const gradeValue = parseInt(gradeValueStr);

            if (gradeValueStr === '' && currentElementContext) { // Note leeren -> löschen
                 if (confirm('Note wirklich löschen?')) {
                    const subjectField = currentElementContext.closest('.subject-field');
                    currentElementContext.remove();
                    if (subjectField) calculateAndUpdateSubjectAverage(subjectField);
                 }
            } else if (!isNaN(gradeValue) && gradeValue >= 1 && gradeValue <= 6 && currentElementContext) {
                updateGradeVisuals(currentElementContext, gradeValue);
                const subjectField = currentElementContext.closest('.subject-field');
                if (subjectField) calculateAndUpdateSubjectAverage(subjectField);
            }
            needsOverallRecalculation = true;
        }
        closeModal();
        if (needsOverallRecalculation) {
            calculateAndDisplayOverallAverage();
        }
    });

    modalInputText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') modalConfirmBtn.click();
    });
    modalInputGrade.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') modalConfirmBtn.click();
    });

    // --- SUBJECT FUNCTIONS ---
    function addSubject(name) {
        console.log("Attempting to add subject:", name); // DEBUG

        // Stelle sicher, dass das Template existiert und korrekt ist
        const templateElement = document.getElementById('subject-template');
        if (!templateElement) {
            console.error("FATAL ERROR in addSubject: HTML <template id='subject-template'> not found!");
            return undefined; // Explizit undefined zurückgeben, das verursacht den Fehler weiter unten
        }
        if (!templateElement.content) {
            console.error("FATAL ERROR in addSubject: <template id='subject-template'> has no .content property! Is it a valid template tag?");
            return undefined;
        }

        const subjectElement = templateElement.content.cloneNode(true).firstElementChild;
        if (!subjectElement) {
            console.error("FATAL ERROR in addSubject: Cloning from subject-template failed. Check if the template has a valid root element (e.g., a <div> directly inside <template>). `template.content.firstElementChild` was null.");
            return undefined;
        }

        subjectElement.dataset.subjectId = `subject-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
        
        const nameDisplayElement = subjectElement.querySelector('.subject-name');
        if (!nameDisplayElement) {
            console.error("FATAL ERROR in addSubject: '.subject-name' element not found within the cloned subject-template. Check your template structure for a child element with class 'subject-name'.");
            return undefined;
        }
        nameDisplayElement.textContent = name;
        
        setupSubjectEventListeners(subjectElement);

        const container = document.getElementById('subjects-container');
        if (!container) {
            // Dieser Fehler sollte nicht auftreten, wenn die grundlegende HTML-Struktur korrekt ist
            console.error("CRITICAL ERROR in addSubject: <div id='subjects-container'> not found in the DOM!");
            // Optional: throw new Error("subjects-container missing"); oder auch undefined zurückgeben
        } else {
            container.appendChild(subjectElement);
        }
        
        calculateAndUpdateSubjectAverage(subjectElement); // Dies sollte funktionieren, wenn subjectElement gültig ist
        
        console.log("Successfully created subject element, returning:", subjectElement); // DEBUG
        return subjectElement;
    }

    function setupSubjectEventListeners(subjectElement) {
        subjectElement.querySelector('.delete-subject-btn').addEventListener('click', () => {
            if (confirm(`Sicher, dass du das Fach "${subjectElement.querySelector('.subject-name').textContent}" löschen willst?`)) {
                subjectElement.remove();
            }
        });

        subjectElement.querySelector('.edit-subject-name-btn').addEventListener('click', () => {
            openModal('editSubjectName', subjectElement, subjectElement.querySelector('.subject-name').textContent);
        });

        subjectElement.querySelectorAll('.add-grade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryDiv = btn.closest('.grade-category');
                openModal('addGrade', categoryDiv);
            });
        });

        // Delegated event listener for grade interactions (editing/deletion)
        subjectElement.addEventListener('click', (event) => {
            const target = event.target;

            // 1. Check for click on delete button for a grade (most specific)
            if (target.classList.contains('delete-grade-btn')) {
                const gradeSpan = target.closest('.grade');
                if (gradeSpan && confirm('Note löschen?')) {
                    const subjectField = gradeSpan.closest('.subject-field');
                    gradeSpan.remove();
                    if(subjectField) {
                        calculateAndUpdateSubjectAverage(subjectField);
                        calculateAndDisplayOverallAverage(); // Wichtig hier!
                    }
                }
                return; // Stop further processing
            }

            // 2. Check for click on a grade (for editing), but not if it was the delete button
            const clickedGradeSpan = target.closest('.grade');
            if (clickedGradeSpan) {
                // If the click was on a child of .grade (like .grade-value) or .grade itself,
                // and it wasn't the delete button (handled above), then open edit modal.
                openModal('editGrade', clickedGradeSpan, clickedGradeSpan.querySelector('.grade-value').textContent);
                return; // Stop further processing
            }
        });
    }

    addSubjectBtn.addEventListener('click', () => openModal('addSubject'));

    // --- GRADE FUNCTIONS ---
    function addGradeToCategory(categoryElement, value) {
        const gradeElement = gradeTemplate.content.cloneNode(true).firstElementChild;
        updateGradeVisuals(gradeElement, value); // Sets text and data-attribute

        categoryElement.querySelector('.grades-list').appendChild(gradeElement);
        const subjectField = categoryElement.closest('.subject-field');
        if (subjectField) calculateAndUpdateSubjectAverage(subjectField);
    }
    
    function updateGradeVisuals(gradeElement, value) {
        gradeElement.querySelector('.grade-value').textContent = value;
        gradeElement.dataset.gradeValue = value; // This drives the CSS color based on [data-grade-value]
    }

    // --- CALCULATION FUNCTIONS ---
    function calculateAverage(gradesArray) {
        if (!gradesArray || gradesArray.length === 0) return 0; // Return 0 to simplify calculations, handle display later
        const sum = gradesArray.reduce((acc, grade) => acc + grade, 0);
        return sum / gradesArray.length;
    }

    function calculateAndUpdateSubjectAverage(subjectElement) {
        const getGradesFromCategory = (categoryDataAttr) => 
            Array.from(subjectElement.querySelector(`.grade-category[data-category="${categoryDataAttr}"] .grades-list`).children)
                 .map(g => parseInt(g.querySelector('.grade-value').textContent))
                 .filter(g => !isNaN(g)); // Filter out NaN in case of parsing issues

        const gradesSA = getGradesFromCategory('sa');
        const gradesWritten = getGradesFromCategory('written');
        const gradesOral = getGradesFromCategory('oral');

        const avgSA = calculateAverage(gradesSA);
        const combinedRestGrades = [...gradesWritten, ...gradesOral];
        const avgRest = calculateAverage(combinedRestGrades);

        let finalAverage;
        const hasSAGrades = gradesSA.length > 0;
        const hasRestGrades = combinedRestGrades.length > 0;

        if (!hasSAGrades && !hasRestGrades) {
            finalAverage = 0; 
        } else if (!hasSAGrades) {
            finalAverage = avgRest;
        } else if (!hasRestGrades) {
            finalAverage = avgSA;
        } else {
            finalAverage = (2 * avgSA + avgRest) / 3;
        }
        
        const averageDisplay = subjectElement.querySelector('.subject-average');
        if (finalAverage === 0 && !hasSAGrades && !hasRestGrades) {
            averageDisplay.textContent = 'N/A';
            averageDisplay.dataset.gradeValue = 'N/A';
        } else {
            averageDisplay.textContent = finalAverage.toFixed(2).replace('.', ','); // Mit Komma für deutsche Darstellung
            averageDisplay.dataset.gradeValue = Math.round(finalAverage); // For CSS coloring, rounded
        }
    }

    function calculateAndDisplayOverallAverage() {
        const subjectAverageElements = subjectsContainer.querySelectorAll('.subject-average');
        let sumOfAverages = 0;
        let countOfValidAverages = 0;

        subjectAverageElements.forEach(el => {
            const averageText = el.textContent;
            if (averageText && averageText !== 'N/A') {
                // Komma durch Punkt ersetzen für parseFloat, falls vorhanden
                const averageValue = parseFloat(averageText.replace(',', '.'));
                if (!isNaN(averageValue)) {
                    sumOfAverages += averageValue;
                    countOfValidAverages++;
                }
            }
        });

        if (countOfValidAverages > 0) {
            const overallAverage = sumOfAverages / countOfValidAverages;
            overallAverageValueDisplay.textContent = overallAverage.toFixed(2).replace('.', ',');
            
            // Farbgebung basierend auf dem gerundeten Wert
            const displayGradeValue = Math.min(6, Math.max(1, Math.round(overallAverage)));
            overallAverageValueDisplay.dataset.gradeValue = isNaN(displayGradeValue) ? 'N/A' : displayGradeValue.toString();
        } else {
            overallAverageValueDisplay.textContent = 'N/A';
            overallAverageValueDisplay.dataset.gradeValue = 'N/A';
        }
    }

    // --- HELPER FUNCTION ZUM LÖSCHEN ALLER FÄCHER (für Import) ---
    function clearAllSubjects() {
        subjectsContainer.innerHTML = ''; // Einfachste Methode, entfernt auch alle Event Listener
    }

    // --- IMPORT/EXPORT EVENT LISTENERS ---
    exportBtn.addEventListener('click', () => {
        const dataToExport = GradianImportExport.prepareDataForExport(subjectsContainer);
        GradianImportExport.triggerDownload(dataToExport, `gradian_data_${new Date().toISOString().slice(0,10)}.json`);
    });

    importBtn.addEventListener('click', () => {
        importFileInput.click(); // Öffnet den Dateiauswahl-Dialog
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        GradianImportExport.handleFileUpload(
            file,
            (parsedData) => { // onSuccess Callback
                if (!confirm("Möchtest du die aktuellen Daten wirklich überschreiben und die neue Datei importieren?")) {
                    importFileInput.value = ''; // Reset file input
                    return;
                }
                clearAllSubjects();
                parsedData.subjects.forEach(subjectData => {
                    const newSubjectElement = addSubject(subjectData.name); 
                    // FÜGE DEN FOLGENDEN IF-BLOCK EIN:
                    if (!newSubjectElement) {
                        console.error(`Import Error: Failed to create subject element for "${subjectData.name}". Skipping this subject and its grades. Check previous console errors for details from addSubject.`);
                        // alert(`Problem beim Erstellen des Fachs "${subjectData.name}". Es wird übersprungen.`); // Optionaler User-Alert
                        return; // In einer forEach-Schleife entspricht 'return' einem 'continue'
                    }
                    // BIS HIER

                    if (subjectData.grades) {
                        if (subjectData.grades.sa) {
                            const saCategory = newSubjectElement.querySelector('.grade-category[data-category="sa"]');
                            // Füge auch hier eine kleine Prüfung hinzu:
                            if (saCategory) {
                                subjectData.grades.sa.forEach(grade => addGradeToCategory(saCategory, grade));
                            } else {
                                console.warn(`Import Warning: SA category not found in subject "${subjectData.name}". Skipping SA grades.`);
                            }
                        }
                        if (subjectData.grades.written) {
                            const writtenCategory = newSubjectElement.querySelector('.grade-category[data-category="written"]');
                            if (writtenCategory) {
                                subjectData.grades.written.forEach(grade => addGradeToCategory(writtenCategory, grade));
                            } else {
                                console.warn(`Import Warning: Written category not found in subject "${subjectData.name}". Skipping written grades.`);
                            }
                        }
                        if (subjectData.grades.oral) {
                            const oralCategory = newSubjectElement.querySelector('.grade-category[data-category="oral"]');
                            if (oralCategory) {
                                subjectData.grades.oral.forEach(grade => addGradeToCategory(oralCategory, grade));
                            } else {
                                console.warn(`Import Warning: Oral category not found in subject "${subjectData.name}". Skipping oral grades.`);
                            }
                        }
                    }
                    calculateAndUpdateSubjectAverage(newSubjectElement);
                });
                calculateAndDisplayOverallAverage();
                alert("Daten erfolgreich importiert!");
                importFileInput.value = ''; // Reset file input, damit dieselbe Datei erneut gewählt werden kann
            },
            (errorMessage) => { // onError Callback
                alert(`Fehler beim Import: ${errorMessage}`);
                importFileInput.value = ''; // Reset file input
            }
        );
    });
});