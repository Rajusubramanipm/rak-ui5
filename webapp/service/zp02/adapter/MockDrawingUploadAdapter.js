sap.ui.define([], function () {
    "use strict";

    // FRONTEND_IMPLEMENTATION_ASSUMPTION #2: PDF/DWG/DXF, 10 MB (BRD silent on Step 9 types)
    var FILE_VALIDATION = {
        allowedTypes: ["pdf", "dwg", "dxf"],
        maxSizeBytes: 10 * 1024 * 1024
    };

    var DEPT_NOTES = {
        drawings:   "Please upload all the Architectural, Structural and MEP Drawings.",
        barjeel:    "Please upload all Barjeel system drawings and specifications.",
        structural: "Please upload all Structural engineering drawings and calculations."
    };

    return {

        getGroups: function () {
            return [
                { key: "drawings",   label: "Upload Drawings" },
                { key: "barjeel",    label: "Upload Barjeel Files" },
                { key: "structural", label: "Upload Structural Drawings" }
            ];
        },

        getDeptNote: function (sGroupKey) {
            return DEPT_NOTES[sGroupKey] || "";
        },

        getFileValidation: function () {
            return FILE_VALIDATION;
        },

        validateFile: function (oMeta) {
            if (!oMeta || !oMeta.fileName) {
                return { valid: false, message: "Invalid file." };
            }
            var sParts = oMeta.fileName.split(".");
            var sExt = sParts.length > 1 ? sParts[sParts.length - 1].toLowerCase() : "";
            if (FILE_VALIDATION.allowedTypes.indexOf(sExt) === -1) {
                return { valid: false, message: "File type not allowed. Use PDF, DWG, or DXF." };
            }
            if (oMeta.fileSize > FILE_VALIDATION.maxSizeBytes) {
                return { valid: false, message: "File exceeds the 10 MB limit." };
            }
            return { valid: true, message: "" };
        },

        simulateUpload: function (fnProgress, fnComplete) {
            var iProgress = 0;
            var iInterval = setInterval(function () {
                iProgress += Math.floor(Math.random() * 20) + 10;
                if (iProgress >= 100) {
                    iProgress = 100;
                    clearInterval(iInterval);
                    fnProgress(100);
                    setTimeout(fnComplete, 200);
                } else {
                    fnProgress(iProgress);
                }
            }, 250);
            return iInterval;
        },

        saveGroup: function (sGroupKey, oGroupData) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve({ success: true, groupKey: sGroupKey });
                }, 300);
            });
        },

        submitGroup: function (sGroupKey, oGroupData) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve({ success: true, groupKey: sGroupKey });
                }, 400);
            });
        },

        getSubmissionGuide: function () {
            return {
                fileName: "Drawing_Submission_Guide_ZP02.pdf",
                content:  "Mock submission guide — not available in the local implementation."
            };
        }

    };
});
