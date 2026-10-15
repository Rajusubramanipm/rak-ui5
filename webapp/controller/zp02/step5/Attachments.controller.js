sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp02/AttachmentService"
], function (Controller, JSONModel, MessageToast, MessageBox, AttachmentService) {
    "use strict";

    var STEP_LABELS = ["Select Project", "Permit Information", "Fences & Buildings", "Business Partners", "Attachments", "Summary"];

    return Controller.extend("rak.services.controller.zp02.step5.Attachments", {

        // Map of binding path → FileUploader reference for .clear()
        _oFileUploaderMap: {},
        // Map of binding path → setInterval id for upload simulation cleanup
        _oUploadIntervals: {},

        onInit: function () {
            var oViewModel = new JSONModel({
                activeStep: 5,
                stepLabels: STEP_LABELS,
                project: { ownerName: "", projectNumber: "", address: "" },
                docItems: [],
                additionalDocuments: [],
                loadCard: {
                    uploadState: "IDLE",
                    uploadProgress: 0,
                    uploadError: null,
                    fileMeta: null
                },
                declarationAccepted: false,
                declarationText: "",
                declarationError: null,
                // UI only: after MSG-C08, highlight the documents counted as missing
                highlightMissing: false
            });
            this.getView().setModel(oViewModel, "view");
            this.getOwnerComponent().getRouter().getRoute("zp02-attachments").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oProject  = oAppState ? oAppState.getProperty("/selectedProject") : null;

            if (!oProject) {
                oProject = {
                    projectId: "PRJ-001",
                    parcelId: "409030901",
                    projectNumber: "409030901",
                    ownerName: "Abdullah Al-Aziz",
                    address: "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
                };
                if (oAppState) {
                    oAppState.setProperty("/selectedProject", oProject);
                }
            }

            this._clearIntervals();
            this._oFileUploaderMap = {};
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/project", {
                ownerName:     oProject.ownerName     || "Abdullah Al-Aziz",
                projectNumber: oProject.parcelId      || oProject.projectNumber || "409030901",
                address:       oProject.address       || "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
            });
            oViewModel.setProperty("/additionalDocuments", []);
            oViewModel.setProperty("/loadCard", {
                uploadState: "IDLE",
                uploadProgress: 0,
                uploadError: null,
                fileMeta: null
            });
            oViewModel.setProperty("/declarationAccepted", false);
            oViewModel.setProperty("/declarationError", null);
            oViewModel.setProperty("/highlightMissing", false);
            var sApplicantName = oAppState.getProperty("/applicant/name") || oProject.ownerName || "Abdullah Al-Aziz";
            var sDeclaration = this._getText("msgD01DeclarationText", [sApplicantName]);
            oViewModel.setProperty("/declarationText", sDeclaration);
            this._resolveDocuments(oAppState, oViewModel);
        },

        _resolveDocuments: function (oAppState, oViewModel) {
            oViewModel.setProperty("/docItems", AttachmentService.getAttachmentLayout());
        },

        _clearIntervals: function () {
            var oSelf = this;
            Object.keys(oSelf._oUploadIntervals).forEach(function (sKey) {
                clearInterval(oSelf._oUploadIntervals[sKey]);
            });
            oSelf._oUploadIntervals = {};
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // ── Document list handlers ────────────────────────────────────────────

        onDocumentFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            this._oFileUploaderMap[sPath] = oFileUploader;
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) { return; }
            var oFile = aFiles[0];
            var sRef = oContext.getProperty("ref");
            var oMeta = { fileName: oFile.name, fileSize: oFile.size };
            var oValidation = AttachmentService.validateFileMetadata(oMeta, sRef);
            var oViewModel = this.getView().getModel("view");
            if (!oValidation.valid) {
                oViewModel.setProperty(sPath + "/uploadError", this._getText("msgV07"));
                return;
            }
            oViewModel.setProperty(sPath + "/uploadError", null);
            oViewModel.setProperty(sPath + "/uploadState", "UPLOADING");
            oViewModel.setProperty(sPath + "/uploadProgress", 0);
            var oSelf = this;
            var iInterval = AttachmentService.simulateUpload(
                function (iProgress) {
                    oViewModel.setProperty(sPath + "/uploadProgress", iProgress);
                },
                function () {
                    delete oSelf._oUploadIntervals[sPath];
                    oViewModel.setProperty(sPath + "/uploadState", "UPLOADED");
                    oViewModel.setProperty(sPath + "/fileMeta", { fileName: oFile.name, fileSize: oFile.size });
                }
            );
            this._oUploadIntervals[sPath] = iInterval;
        },

        onDocumentFileSizeExceed: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            this.getView().getModel("view").setProperty(oContext.getPath() + "/uploadError", this._getText("msgV07"));
        },

        onDocumentTypeMissmatch: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            this.getView().getModel("view").setProperty(oContext.getPath() + "/uploadError", this._getText("msgV07"));
        },

        onRemoveDocumentFile: function (oEvent) {
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            if (this._oUploadIntervals[sPath]) {
                clearInterval(this._oUploadIntervals[sPath]);
                delete this._oUploadIntervals[sPath];
            }
            var oFu = this._oFileUploaderMap[sPath];
            if (oFu) { oFu.clear(); }
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty(sPath + "/uploadState", "IDLE");
            oViewModel.setProperty(sPath + "/uploadProgress", 0);
            oViewModel.setProperty(sPath + "/fileMeta", null);
            oViewModel.setProperty(sPath + "/uploadError", null);
        },

        // ── Additional documents handlers ─────────────────────────────────────

        onAddAnotherFile: function () {
            var oViewModel = this.getView().getModel("view");
            var aDocs = oViewModel.getProperty("/additionalDocuments") || [];
            aDocs.push({
                description: "",
                uploadState: "IDLE",
                uploadProgress: 0,
                uploadError: null,
                fileMeta: null
            });
            oViewModel.setProperty("/additionalDocuments", aDocs);
        },

        onRemoveAdditionalDocument: function (oEvent) {
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            var aParts = sPath.split("/");
            var iIdx = parseInt(aParts[aParts.length - 1], 10);
            if (isNaN(iIdx)) { return; }
            var oViewModel = this.getView().getModel("view");
            var aDocs = oViewModel.getProperty("/additionalDocuments") || [];
            aDocs.splice(iIdx, 1);
            oViewModel.setProperty("/additionalDocuments", aDocs.slice());
        },

        onAdditionalFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) { return; }
            var oFile = aFiles[0];
            var oMeta = { fileName: oFile.name, fileSize: oFile.size };
            var oValidation = AttachmentService.validateFileMetadata(oMeta, null);
            var oViewModel = this.getView().getModel("view");
            if (!oValidation.valid) {
                oViewModel.setProperty(sPath + "/uploadError", this._getText("msgV07"));
                return;
            }
            oViewModel.setProperty(sPath + "/uploadError", null);
            oViewModel.setProperty(sPath + "/uploadState", "UPLOADING");
            oViewModel.setProperty(sPath + "/uploadProgress", 0);
            var oSelf = this;
            var iInterval = AttachmentService.simulateUpload(
                function (iProgress) {
                    oViewModel.setProperty(sPath + "/uploadProgress", iProgress);
                },
                function () {
                    delete oSelf._oUploadIntervals[sPath];
                    oViewModel.setProperty(sPath + "/uploadState", "UPLOADED");
                    oViewModel.setProperty(sPath + "/fileMeta", { fileName: oFile.name, fileSize: oFile.size });
                }
            );
            this._oUploadIntervals[sPath] = iInterval;
        },

        onAdditionalFileSizeExceed: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            this.getView().getModel("view").setProperty(oContext.getPath() + "/uploadError", this._getText("msgV07"));
        },

        // ── Load Card handlers ────────────────────────────────────────────────

        onLoadCardFileChange: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) { return; }
            var oFile = aFiles[0];
            var oMeta = { fileName: oFile.name, fileSize: oFile.size };
            var oValidation = AttachmentService.validateFileMetadata(oMeta, "DOC-21");
            var oViewModel = this.getView().getModel("view");
            if (!oValidation.valid) {
                oViewModel.setProperty("/loadCard/uploadError", this._getText("msgV07"));
                return;
            }
            oViewModel.setProperty("/loadCard/uploadError", null);
            oViewModel.setProperty("/loadCard/uploadState", "UPLOADING");
            oViewModel.setProperty("/loadCard/uploadProgress", 0);
            var oSelf = this;
            var iInterval = AttachmentService.simulateUpload(
                function (iProgress) {
                    oViewModel.setProperty("/loadCard/uploadProgress", iProgress);
                },
                function () {
                    delete oSelf._oUploadIntervals["loadCard"];
                    oViewModel.setProperty("/loadCard/uploadState", "UPLOADED");
                    oViewModel.setProperty("/loadCard/fileMeta", { fileName: oFile.name, fileSize: oFile.size });
                }
            );
            this._oUploadIntervals["loadCard"] = iInterval;
        },

        onLoadCardFileSizeExceed: function () {
            this.getView().getModel("view").setProperty("/loadCard/uploadError", this._getText("msgV07"));
        },

        onLoadCardTypeMissmatch: function () {
            this.getView().getModel("view").setProperty("/loadCard/uploadError", this._getText("msgV07"));
        },

        onRemoveLoadCardFile: function () {
            if (this._oUploadIntervals["loadCard"]) {
                clearInterval(this._oUploadIntervals["loadCard"]);
                delete this._oUploadIntervals["loadCard"];
            }
            var oFu = this.byId("loadCardFileUploader");
            if (oFu) { oFu.clear(); }
            this.getView().getModel("view").setProperty("/loadCard", {
                uploadState: "IDLE",
                uploadProgress: 0,
                uploadError: null,
                fileMeta: null
            });
        },

        onDownloadLoadCardTemplate: function () {
            MessageToast.show("Load Card template download is not available in the mock environment.");
        },

        // ── Declaration ───────────────────────────────────────────────────────

        onDeclarationChange: function () {
            this.getView().getModel("view").setProperty("/declarationError", null);
        },

        // ── Navigation ────────────────────────────────────────────────────────

        onNext: function () {
            var oViewModel = this.getView().getModel("view");
            var bDeclarationAccepted = oViewModel.getProperty("/declarationAccepted");
            if (!bDeclarationAccepted) {
                oViewModel.setProperty("/declarationError", this._getText("step5ValDeclarationRequired"));
                return;
            }
            oViewModel.setProperty("/declarationError", null);
            var aDocItems = oViewModel.getProperty("/docItems") || [];
            var oLoadCard = oViewModel.getProperty("/loadCard");
            var aMissing = AttachmentService.getMissingMandatoryDocuments(aDocItems, oLoadCard);
            if (aMissing.length > 0) {
                oViewModel.setProperty("/highlightMissing", true);
                this.byId("mandatoryAttachDialog").open();
                return;
            }
            this._saveAndNavigate();
        },

        onMandatoryDialogCancel: function () {
            this.byId("mandatoryAttachDialog").close();
        },

        onMandatoryDialogNext: function () {
            this.byId("mandatoryAttachDialog").close();
            this._saveAndNavigate();
        },

        _saveAndNavigate: function () {
            var oViewModel = this.getView().getModel("view");
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/step5", {
                docItems: oViewModel.getProperty("/docItems"),
                additionalDocuments: oViewModel.getProperty("/additionalDocuments"),
                loadCard: oViewModel.getProperty("/loadCard"),
                declarationAccepted: oViewModel.getProperty("/declarationAccepted")
            });
            this.getOwnerComponent().getRouter().navTo("zp02-summary");
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-business-partners");
        },

        onSaveDraft: function () {
            MessageToast.show(this._getText("msgC03SaveDraftSuccess"));
        },

        onDelete: function () {
            var oSelf = this;
            MessageBox.confirm(this._getText("msgC01DeleteConfirm"), {
                title: this._getText("msgC01DeleteConfirmTitle"),
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oSelf.getOwnerComponent().getRouter().navTo("zp02-project-selection");
                    }
                }
            });
        }

    });
});
