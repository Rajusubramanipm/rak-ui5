sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "rak/services/service/zp02/DrawingUploadService"
], function (Controller, JSONModel, MessageToast, DrawingUploadService) {
    "use strict";

    function _makeGroupState() {
        return {
            comment: "",
            files: [_makeFileSlot()],
            status: "DRAFT"
        };
    }

    function _makeFileSlot() {
        return {
            uploadState:    "IDLE",
            uploadProgress: 0,
            uploadError:    null,
            fileMeta:       null
        };
    }

    return Controller.extend("rak.services.controller.zp02.step9.DrawingUpload", {

        // path → FileUploader reference (for .clear())
        _oFileUploaderMap: {},
        // path → setInterval id (for cleanup)
        _oUploadIntervals: {},

        onInit: function () {
            var oViewModel = new JSONModel({
                requestId:      "",
                buildingIds:    [],
                buildingIdsText: "",
                parcelId:       "",
                ownerName:      "",
                deptNotes: {
                    drawings:   DrawingUploadService.getDepartmentNote("drawings"),
                    barjeel:    DrawingUploadService.getDepartmentNote("barjeel"),
                    structural: DrawingUploadService.getDepartmentNote("structural")
                },
                groups: {
                    drawings:   _makeGroupState(),
                    barjeel:    _makeGroupState(),
                    structural: _makeGroupState()
                }
            });
            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-drawing-upload")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");

            // Route guard: must have a selected project
            if (!oAppState || !oAppState.getProperty("/selectedProject")) {
                this.getOwnerComponent().getRouter().navTo("zp02-project-selection");
                return;
            }

            // Route guard: must have a confirmed request (step8 complete — bypass for prototype)
            var sRequestId = oAppState.getProperty("/step8/requestId");
            if (!sRequestId) {
                var oMockStep8 = {
                    requestId:   "REQ-" + Math.floor(Math.random() * 90000 + 10000),
                    buildingIds: ["BLD-20-12876"],
                    fenceIds:    [],
                    generatedAt: new Date().toISOString()
                };
                oAppState.setProperty("/step8", oMockStep8);
            }

            this._clearAllIntervals();
            this._oFileUploaderMap = {};

            this._loadContext(oAppState);
        },

        _loadContext: function (oAppState) {
            var oVM = this.getView().getModel("view");
            var oProject    = oAppState.getProperty("/selectedProject") || {};
            var oStep8      = oAppState.getProperty("/step8") || {};
            var aBuildingIds = oStep8.buildingIds || [];

            oVM.setProperty("/requestId",       oStep8.requestId || "");
            oVM.setProperty("/buildingIds",     aBuildingIds);
            oVM.setProperty("/buildingIdsText",
                aBuildingIds.length > 0 ? aBuildingIds.join(", ") : "—");
            oVM.setProperty("/parcelId",        oProject.parcelId    || "—");
            oVM.setProperty("/ownerName",       oProject.ownerName   || "");

            // Restore step9 state from appState — only groups that have been touched
            var oStep9 = oAppState.getProperty("/step9");
            if (oStep9 && oStep9.groups) {
                var aKeys = ["drawings", "barjeel", "structural"];
                for (var i = 0; i < aKeys.length; i++) {
                    var sKey = aKeys[i];
                    var oSaved = oStep9.groups[sKey];
                    if (oSaved && (oSaved.files.length > 0 || oSaved.comment || oSaved.status !== "DRAFT")) {
                        oVM.setProperty("/groups/" + sKey, oSaved);
                    }
                }
            }
        },

        _clearAllIntervals: function () {
            var oSelf = this;
            Object.keys(oSelf._oUploadIntervals).forEach(function (sKey) {
                clearInterval(oSelf._oUploadIntervals[sKey]);
            });
            oSelf._oUploadIntervals = {};
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // Parse group key from a view-model binding path like /groups/drawings/files/0
        _groupKeyFromPath: function (sPath) {
            var aParts = sPath.split("/");
            // expected: ["", "groups", "drawings", "files", "0"]
            return aParts.length >= 3 ? aParts[2] : null;
        },

        // ── File Upload Handlers ─────────────────────────────────────────────

        onFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            this._oFileUploaderMap[sPath] = oFileUploader;

            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) { return; }
            var oFile = aFiles[0];
            var oMeta = { fileName: oFile.name, fileSize: oFile.size };
            var oResult = DrawingUploadService.validateFileMetadata(oMeta);
            var oViewModel = this.getView().getModel("view");

            if (!oResult.valid) {
                oViewModel.setProperty(sPath + "/uploadState",  "ERROR");
                oViewModel.setProperty(sPath + "/uploadError",  this._getText("step9FileTypeError"));
                return;
            }

            oViewModel.setProperty(sPath + "/uploadError",    null);
            oViewModel.setProperty(sPath + "/uploadState",    "UPLOADING");
            oViewModel.setProperty(sPath + "/uploadProgress", 0);

            var oSelf = this;
            var iInterval = DrawingUploadService.simulateUpload(
                function (iProgress) {
                    oViewModel.setProperty(sPath + "/uploadProgress", iProgress);
                },
                function () {
                    delete oSelf._oUploadIntervals[sPath];
                    oViewModel.setProperty(sPath + "/uploadState",  "UPLOADED");
                    oViewModel.setProperty(sPath + "/fileMeta",
                        { fileName: oFile.name, fileSize: oFile.size });
                }
            );
            this._oUploadIntervals[sPath] = iInterval;
        },

        onFileTypeMismatch: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty(sPath + "/uploadState", "ERROR");
            oViewModel.setProperty(sPath + "/uploadError", this._getText("step9FileTypeError"));
        },

        onFileSizeExceed: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oContext = oFileUploader.getBindingContext("view");
            if (!oContext) { return; }
            var sPath = oContext.getPath();
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty(sPath + "/uploadState", "ERROR");
            oViewModel.setProperty(sPath + "/uploadError", this._getText("step9FileSizeError"));
        },

        onRemoveFile: function (oEvent) {
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
            oViewModel.setProperty(sPath + "/uploadState",    "IDLE");
            oViewModel.setProperty(sPath + "/uploadProgress", 0);
            oViewModel.setProperty(sPath + "/uploadError",    null);
            oViewModel.setProperty(sPath + "/fileMeta",       null);
        },

        onAddFile: function (oEvent) {
            var sGroupKey = oEvent.getSource().getCustomData()[0].getValue();
            var oViewModel = this.getView().getModel("view");
            var sFilesPath = "/groups/" + sGroupKey + "/files";
            var aFiles = oViewModel.getProperty(sFilesPath) || [];
            aFiles.push(_makeFileSlot());
            oViewModel.setProperty(sFilesPath, aFiles.slice());
        },

        // ── Save / Submit ────────────────────────────────────────────────────

        onSaveGroup: function (oEvent) {
            var sGroupKey = oEvent.getSource().getCustomData()[0].getValue();
            var oViewModel = this.getView().getModel("view");
            var oGroupData = oViewModel.getProperty("/groups/" + sGroupKey);

            DrawingUploadService.saveGroup(sGroupKey, oGroupData).then(function () {
                oViewModel.setProperty("/groups/" + sGroupKey + "/status", "SAVED");
                // Persist to appState
                var oAppState = this.getOwnerComponent().getModel("appState");
                var oStep9 = oAppState.getProperty("/step9") || { groups: {} };
                oStep9.groups[sGroupKey] = oViewModel.getProperty("/groups/" + sGroupKey);
                oAppState.setProperty("/step9", oStep9);
                MessageToast.show(this._getText("step9SavedToast"));
            }.bind(this));
        },

        onSubmitGroup: function (oEvent) {
            var sGroupKey = oEvent.getSource().getCustomData()[0].getValue();
            var oViewModel = this.getView().getModel("view");
            var oGroupData = oViewModel.getProperty("/groups/" + sGroupKey);

            DrawingUploadService.submitGroup(sGroupKey, oGroupData).then(function () {
                oViewModel.setProperty("/groups/" + sGroupKey + "/status", "SUBMITTED");
                // Persist to appState
                var oAppState = this.getOwnerComponent().getModel("appState");
                var oStep9 = oAppState.getProperty("/step9") || { groups: {} };
                oStep9.groups[sGroupKey] = oViewModel.getProperty("/groups/" + sGroupKey);
                oAppState.setProperty("/step9", oStep9);
                MessageToast.show(this._getText("step9SubmittedToast"));
            }.bind(this));
        },

        // ── Guide Download ───────────────────────────────────────────────────

        onDownloadGuide: function () {
            MessageToast.show(this._getText("step9GuideToast"));
        },

        // ── Navigation ───────────────────────────────────────────────────────

        onBackToConfirmation: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-confirmation");
        },

        // ── Lifecycle ────────────────────────────────────────────────────────

        onExit: function () {
            this._clearAllIntervals();
        }

    });
});
