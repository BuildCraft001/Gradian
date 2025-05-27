// importExport.js

const GradianImportExport = (() => {

    const CURRENT_DATA_VERSION = "1.0.0";

    function prepareDataForExport(subjectsContainer) {
        const subjectsData = [];
        const subjectElements = subjectsContainer.querySelectorAll('.subject-field');

        subjectElements.forEach(subjectElement => {
            const subjectName = subjectElement.querySelector('.subject-name').textContent;
            const grades = {
                sa: [],
                written: [],
                oral: []
            };

            const saGrades = subjectElement.querySelectorAll('.grade-category[data-category="sa"] .grade-value');
            saGrades.forEach(g => grades.sa.push(parseInt(g.textContent)));

            const writtenGrades = subjectElement.querySelectorAll('.grade-category[data-category="written"] .grade-value');
            writtenGrades.forEach(g => grades.written.push(parseInt(g.textContent)));

            const oralGrades = subjectElement.querySelectorAll('.grade-category[data-category="oral"] .grade-value');
            oralGrades.forEach(g => grades.oral.push(parseInt(g.textContent)));

            subjectsData.push({
                name: subjectName,
                grades: grades
            });
        });

        return {
            version: CURRENT_DATA_VERSION,
            gradianDataTimestamp: new Date().toISOString(),
            subjects: subjectsData
        };
    }

    function triggerDownload(jsonData, filename = 'gradian_data.json') {
        const dataStr = JSON.stringify(jsonData, null, 2); // null, 2 für Pretty Print
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        document.body.appendChild(linkElement); // Firefox benötigt dies
        linkElement.click();
        document.body.removeChild(linkElement); // Aufräumen
    }

    function handleFileUpload(file, onSuccess, onError) {
        if (!file) {
            if (onError) onError("Keine Datei ausgewählt.");
            return;
        }

        if (file.type !== "application/json") {
            if (onError) onError("Ungültiger Dateityp. Bitte eine JSON-Datei auswählen.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);
                // Basis-Validierung (könnte ausgebaut werden)
                if (parsedData && Array.isArray(parsedData.subjects)) {
                    if (onSuccess) onSuccess(parsedData);
                } else {
                    if (onError) onError("Die JSON-Datei hat nicht die erwartete Struktur.");
                }
            } catch (e) {
                if (onError) onError("Fehler beim Parsen der JSON-Datei: " + e.message);
            }
        };
        reader.onerror = () => {
            if (onError) onError("Fehler beim Lesen der Datei.");
        };
        reader.readAsText(file);
    }

    return {
        prepareDataForExport,
        triggerDownload,
        handleFileUpload
    };

})();