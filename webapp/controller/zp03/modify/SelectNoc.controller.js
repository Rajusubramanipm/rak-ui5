sap.ui.define([
    "rak/services/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp03/ZP03ServiceFacade",
    "rak/services/service/zp03/ZP03ValidationService"
], function (BaseController, JSONModel, MessageToast, MessageBox, ZP03ServiceFacade, ZP03ValidationService) {
    "use strict";

    var STORAGE_KEY = "rak.services.zp03.modify.selectedNoc";

    function clone(o) {
        return JSON.parse(JSON.stringify(o || {}));
    }

    function persistSelectedNoc(oNoc) {
        try {
            if (oNoc) {
                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(oNoc));
            } else {
                window.sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            /* ignore quota / private mode */
        }
    }

    function readPersistedSelectedNoc() {
        try {
            var s = window.sessionStorage.getItem(STORAGE_KEY);
            return s ? JSON.parse(s) : null;
        } catch (e) {
            return null;
        }
    }

    return BaseController.extend("rak.services.controller.zp03.modify.SelectNoc", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");

            this._aAllNocs = [];
            this.getView().setModel(new JSONModel({
                busy: false,
                activeStep: 1,
                stepLabels: [],
                displayedNocs: [],
                selectedNocId: null,
                selectedNocNumber: "",
                canContinue: false,
                selectionInvalid: false,
                stopperMessage: "",
                showEmptyState: false
            }), "view");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("zp03-modify-infrastructure-noc").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("zp03-select-noc").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var that = this;
            var oViewModel = this.getView().getModel("view");
            var oAppState = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/activeService", "zp03");
            oViewModel.setProperty("/busy", true);

            Promise.all([
                ZP03ServiceFacade.getModifyStepperLabels(),
                ZP03ServiceFacade.getEligibleNocs()
            ]).then(function (aResults) {
                that._aAllNocs = (aResults[1].items || []).map(function (oItem) {
                    return clone(oItem);
                });

                oViewModel.setProperty("/stepLabels", aResults[0] || []);

                var oExisting = oAppState.getProperty("/zp03/modify/selectedNoc") || readPersistedSelectedNoc();
                if (oExisting && oExisting.nocId) {
                    oViewModel.setProperty("/selectedNocId", oExisting.nocId);
                    oAppState.setProperty("/zp03/modify/selectedNoc", clone(oExisting));
                }

                that._refreshList();
                that._syncSelectionState();
            }).catch(function () {
                MessageToast.show("Unable to load eligible NOCs.");
                that._aAllNocs = [];
                that._refreshList();
            }).finally(function () {
                oViewModel.setProperty("/busy", false);
            });
        },

        _refreshList: function () {
            var oViewModel = this.getView().getModel("view");
            var sSelectedId = oViewModel.getProperty("/selectedNocId");

            // Figma list = ACTIVE candidates only (later-stage blockers remain visible)
            var aList = this._aAllNocs.filter(function (oNoc) {
                return ZP03ValidationService.isListCandidate(oNoc);
            }).map(function (oNoc) {
                var oCopy = clone(oNoc);
                oCopy.selected = oCopy.nocId === sSelectedId;
                return oCopy;
            });

            oViewModel.setProperty("/displayedNocs", aList);
            oViewModel.setProperty("/showEmptyState", aList.length === 0);
        },

        onListUpdateFinished: function () {
            var oList = this.byId("zp03NocList");
            var oViewModel = this.getView().getModel("view");
            if (!oList) {
                return;
            }
            var bInvalid = !!oViewModel.getProperty("/selectionInvalid");
            oList.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("view");
                var bSelected = !!(oCtx && oCtx.getProperty("selected"));
                oItem.toggleStyleClass("zp03NocCard--selected", bSelected && !bInvalid);
                oItem.toggleStyleClass("zp03NocCard--invalid", bSelected && bInvalid);
            });
        },

        _findNocById: function (sNocId) {
            if (!sNocId) {
                return null;
            }
            return this._aAllNocs.filter(function (oNoc) {
                return oNoc.nocId === sNocId;
            })[0] || null;
        },

        _applyValidationToView: function (oNoc, oResult) {
            var oViewModel = this.getView().getModel("view");
            var oAppState = this.getOwnerComponent().getModel("appState");
            var bValid = !!(oResult && oResult.valid);

            oViewModel.setProperty("/canContinue", bValid);
            oViewModel.setProperty("/selectionInvalid", !!(oNoc && !bValid));
            oViewModel.setProperty("/stopperMessage", (oNoc && !bValid) ? (oResult.message || "") : "");
            oViewModel.setProperty("/selectedNocNumber", oNoc ? (oNoc.nocNumber || "") : "");

            if (bValid && oNoc) {
                var oStore = clone(oNoc);
                oAppState.setProperty("/zp03/modify/selectedNoc", oStore);
                persistSelectedNoc(oStore);
            } else {
                oAppState.setProperty("/zp03/modify/selectedNoc", null);
                // Keep invalid selection visible for STATE 03, but do not persist as journey selection
                if (!oNoc) {
                    persistSelectedNoc(null);
                }
            }

            var oInput = this.byId("inpZp03SelectedNoc");
            if (oInput) {
                oInput.toggleStyleClass("zp03SelectedNocInput--error", !!(oNoc && !bValid));
            }

            this.onListUpdateFinished();
        },

        _syncSelectionState: function () {
            var sNocId = this.getView().getModel("view").getProperty("/selectedNocId");
            var oNoc = this._findNocById(sNocId);
            var oValidation = ZP03ValidationService.validateNocSelection(oNoc);
            this._applyValidationToView(oNoc, oValidation);
        },

        _selectNoc: function (sNocId) {
            var that = this;
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/selectedNocId", sNocId || null);
            this._refreshList();

            if (!sNocId) {
                this._syncSelectionState();
                return;
            }

            ZP03ServiceFacade.validateModifyEligibility(sNocId).then(function (oResult) {
                that._applyValidationToView(oResult.noc || that._findNocById(sNocId), oResult);
            }).catch(function () {
                MessageToast.show("Unable to validate NOC eligibility.");
                oViewModel.setProperty("/canContinue", false);
            });
        },

        onCardPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("view");
            if (!oCtx) {
                return;
            }
            this._selectNoc(oCtx.getProperty("nocId"));
        },

        onRadioSelect: function (oEvent) {
            if (!oEvent.getParameter("selected")) {
                return;
            }
            var oCtx = oEvent.getSource().getBindingContext("view");
            if (!oCtx) {
                return;
            }
            this._selectNoc(oCtx.getProperty("nocId"));
        },

        onContinue: function () {
            var that = this;
            var sNocId = this.getView().getModel("view").getProperty("/selectedNocId");
            var oLocal = ZP03ValidationService.validateNocSelection(this._findNocById(sNocId));

            if (!oLocal.valid) {
                this._applyValidationToView(this._findNocById(sNocId), oLocal);
                MessageBox.error(oLocal.message || "Please select an eligible active NOC.");
                return;
            }

            ZP03ServiceFacade.validateModifyEligibility(sNocId).then(function (oResult) {
                that._applyValidationToView(oResult.noc, oResult);
                if (!oResult.valid) {
                    MessageBox.error(oResult.message || "Selected NOC is not eligible.");
                    return;
                }
                that.getOwnerComponent().getRouter().navTo("zp03-details");
            });
        },

        /**
         * FR017 / §4.4.2.3.3 — Save as Draft.
         * BR02: only validate required fields present on current step (selected NOC optional).
         * Mock adapter assigns case number; OData persistence is API-dependent.
         */
        onSaveAsDraft: function () {
            var that = this;
            var oNoc = this._findNocById(this.getView().getModel("view").getProperty("/selectedNocId"));
            var oDraftCheck = ZP03ValidationService.validateDraftAtSelectNoc(oNoc);

            if (!oDraftCheck.valid) {
                MessageBox.error(oDraftCheck.message);
                return;
            }

            ZP03ServiceFacade.saveModifyDraft({
                selectedNoc: oNoc ? JSON.parse(JSON.stringify(oNoc)) : null,
                details: null
            }).then(function (oDraft) {
                that.getOwnerComponent().getModel("appState").setProperty("/zp03/modify/draft", oDraft);
                MessageToast.show(
                    "Draft saved (mock). Case number: " + (oDraft.caseNumber || "—") +
                    ". Status: " + (oDraft.status || "Saved as Draft")
                );
            }).catch(function () {
                MessageBox.error("Unable to save draft. Backend draft API is not connected yet.");
            });
        },

        /**
         * Delete — not specified for Modify applicant flow in BRD §4.4.2.3.
         * Kept visible (Figma) as tracked clarification; no destructive action.
         */
        onDelete: function () {
            MessageBox.information(
                "Delete is shown per Figma MOD-01/MOD-02 chrome but is not defined in BRD V1.4 " +
                "§4.4.2.3 (FR015–FR020) for the Modify applicant journey.\n\n" +
                "Clarification required: whether Delete removes a Saved as Draft case only, " +
                "or is out of scope for Phase 1."
            );
        },

        formatOwnerLine: function (sName) {
            if (sName) {
                return "Owner " + sName;
            }
            var oBundle = this.getView().getModel("i18n") && this.getView().getModel("i18n").getResourceBundle();
            return oBundle ? oBundle.getText("zp03OwnerFallback") : "Owner";
        },

        formatStatusBadge: function (sStatus) {
            var s = String(sStatus || "").toUpperCase();
            var sLabel = s ? s.charAt(0) + s.slice(1).toLowerCase() : "Unknown";
            var sMod = s === "ACTIVE" ? "active" : "neutral";
            return "<span class=\"zp03Badge zp03Badge--" + sMod + "\">" + sLabel + "</span>";
        }
    });
});
