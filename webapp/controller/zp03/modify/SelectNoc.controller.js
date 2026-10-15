sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp03/ZP03ServiceFacade",
    "rak/services/service/zp03/ZP03ValidationService"
], function (Controller, JSONModel, MessageToast, MessageBox, ZP03ServiceFacade, ZP03ValidationService) {
    "use strict";

    function clone(o) {
        return JSON.parse(JSON.stringify(o || {}));
    }

    return Controller.extend("rak.services.controller.zp03.modify.SelectNoc", {

        onInit: function () {
            this.getOwnerComponent().getModel("appState").setProperty("/activeService", "zp03");

            this._aAllNocs = [];
            this.setModel(new JSONModel({
                busy: false,
                activeStep: 1,
                stepLabels: [],
                filters: {
                    search: "",
                    status: "ALL",
                    nocType: "ALL",
                    projectType: "ALL"
                },
                statusOptions: [],
                nocTypeOptions: [],
                projectTypeOptions: [],
                displayedNocs: [],
                selectedNocId: null,
                canContinue: false,
                stopperMessage: "",
                showEmptyEligible: false,
                resultCount: 0,
                totalCount: 0
            }), "view");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("zp03-modify-infrastructure-noc").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("zp03-select-noc").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var that = this;
            var oViewModel = this.getModel("view");
            oViewModel.setProperty("/busy", true);
            oViewModel.setProperty("/activeService", "zp03");

            Promise.all([
                ZP03ServiceFacade.getModifyStepperLabels(),
                ZP03ServiceFacade.getEligibleNocs()
            ]).then(function (aResults) {
                var aLabels = aResults[0] || [];
                var oPayload = aResults[1] || {};
                var oFilters = oPayload.filterOptions || {};

                that._aAllNocs = (oPayload.items || []).map(function (oItem) {
                    return clone(oItem);
                });

                oViewModel.setProperty("/stepLabels", aLabels);
                oViewModel.setProperty("/statusOptions", oFilters.status || []);
                oViewModel.setProperty("/nocTypeOptions", oFilters.nocType || []);
                oViewModel.setProperty("/projectTypeOptions", oFilters.projectType || []);
                oViewModel.setProperty("/totalCount", that._aAllNocs.length);

                var oExisting = that.getOwnerComponent().getModel("appState").getProperty("/zp03/modify/selectedNoc");
                if (oExisting && oExisting.nocId) {
                    oViewModel.setProperty("/selectedNocId", oExisting.nocId);
                }

                that._applyFilters();
                that._syncSelectionState();
            }).catch(function () {
                MessageToast.show("Unable to load eligible NOCs.");
                that._aAllNocs = [];
                that._applyFilters();
            }).finally(function () {
                oViewModel.setProperty("/busy", false);
            });
        },

        _applyFilters: function () {
            var oViewModel = this.getModel("view");
            var oFilters = oViewModel.getProperty("/filters") || {};
            var sSearch = String(oFilters.search || "").trim().toLowerCase();
            var sStatus = oFilters.status || "ALL";
            var sNocType = oFilters.nocType || "ALL";
            var sProjectType = oFilters.projectType || "ALL";
            var sSelectedId = oViewModel.getProperty("/selectedNocId");

            var aFiltered = this._aAllNocs.filter(function (oNoc) {
                if (sStatus !== "ALL" && String(oNoc.status).toUpperCase() !== sStatus) {
                    return false;
                }
                if (sNocType !== "ALL" && oNoc.nocType !== sNocType) {
                    return false;
                }
                if (sProjectType !== "ALL" && oNoc.projectType !== sProjectType) {
                    return false;
                }
                if (!sSearch) {
                    return true;
                }
                var aHaystack = [
                    oNoc.nocNumber,
                    oNoc.projectReference,
                    oNoc.projectName,
                    oNoc.nocType,
                    oNoc.projectType,
                    oNoc.serviceGroup
                ].join(" ").toLowerCase();
                return aHaystack.indexOf(sSearch) !== -1;
            }).map(function (oNoc) {
                var oCopy = clone(oNoc);
                oCopy.selected = oCopy.nocId === sSelectedId;
                return oCopy;
            });

            oViewModel.setProperty("/displayedNocs", aFiltered);
            oViewModel.setProperty("/resultCount", aFiltered.length);

            var bHasEligible = this._aAllNocs.some(function (oNoc) {
                return String(oNoc.status).toUpperCase() === "ACTIVE"
                    && String(oNoc.eligibilityStatus).toUpperCase() === "ELIGIBLE";
            });
            // Empty-eligible banner when catalogue has no eligible NOCs (or load returned none)
            oViewModel.setProperty("/showEmptyEligible", !bHasEligible);
        },

        onListUpdateFinished: function () {
            var oList = this.byId("zp03NocList");
            if (!oList) {
                return;
            }
            oList.getItems().forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("view");
                oItem.toggleStyleClass("zp03NocCard--selected", !!(oCtx && oCtx.getProperty("selected")));
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

        _syncSelectionState: function () {
            var oViewModel = this.getModel("view");
            var sNocId = oViewModel.getProperty("/selectedNocId");
            var oNoc = this._findNocById(sNocId);
            var oValidation = ZP03ValidationService.validateNocSelection(oNoc);

            oViewModel.setProperty("/canContinue", !!oValidation.valid);
            oViewModel.setProperty("/stopperMessage", oValidation.valid ? "" : (oNoc ? oValidation.message : ""));

            var oAppState = this.getOwnerComponent().getModel("appState");
            if (oValidation.valid && oNoc) {
                oAppState.setProperty("/zp03/modify/selectedNoc", clone(oNoc));
            } else if (!oNoc) {
                oAppState.setProperty("/zp03/modify/selectedNoc", null);
            }
            // Keep invalid selection visible with stopper, but clear persisted eligible selection
            if (oNoc && !oValidation.valid) {
                oAppState.setProperty("/zp03/modify/selectedNoc", null);
            }
        },

        _selectNoc: function (sNocId) {
            var that = this;
            var oViewModel = this.getModel("view");
            oViewModel.setProperty("/selectedNocId", sNocId || null);
            this._applyFilters();

            if (!sNocId) {
                this._syncSelectionState();
                return;
            }

            ZP03ServiceFacade.validateModifyEligibility(sNocId).then(function (oResult) {
                oViewModel.setProperty("/canContinue", !!oResult.valid);
                oViewModel.setProperty("/stopperMessage", oResult.valid ? "" : (oResult.message || ""));

                var oAppState = that.getOwnerComponent().getModel("appState");
                if (oResult.valid && oResult.noc) {
                    oAppState.setProperty("/zp03/modify/selectedNoc", clone(oResult.noc));
                } else {
                    oAppState.setProperty("/zp03/modify/selectedNoc", null);
                }
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

        onFilterChange: function () {
            this._applyFilters();
        },

        onSearch: function () {
            this._applyFilters();
        },

        onSearchLiveChange: function (oEvent) {
            this.getModel("view").setProperty("/filters/search", oEvent.getParameter("newValue") || "");
            this._applyFilters();
        },

        onContinue: function () {
            var that = this;
            var sNocId = this.getModel("view").getProperty("/selectedNocId");
            var oLocal = ZP03ValidationService.validateNocSelection(this._findNocById(sNocId));

            if (!oLocal.valid) {
                this.getModel("view").setProperty("/stopperMessage", oLocal.message || "");
                MessageBox.error(oLocal.message || "Please select an eligible active NOC.");
                return;
            }

            ZP03ServiceFacade.validateModifyEligibility(sNocId).then(function (oResult) {
                if (!oResult.valid) {
                    that.getModel("view").setProperty("/stopperMessage", oResult.message || "");
                    that.getModel("view").setProperty("/canContinue", false);
                    that.getOwnerComponent().getModel("appState").setProperty("/zp03/modify/selectedNoc", null);
                    MessageBox.error(oResult.message || "Selected NOC is not eligible.");
                    return;
                }
                that.getOwnerComponent().getModel("appState").setProperty("/zp03/modify/selectedNoc", clone(oResult.noc));
                that.getOwnerComponent().getRouter().navTo("zp03-details");
            });
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onSaveAsDraft: function () {
            MessageToast.show("Save as Draft will be available in a later ZP03 step.");
        },

        onDelete: function () {
            MessageToast.show("Delete draft will be available in a later ZP03 step.");
        },

        formatOwnerLine: function (sName) {
            if (sName) {
                return "Owner " + sName;
            }
            var oBundle = this.getView().getModel("i18n") && this.getView().getModel("i18n").getResourceBundle();
            return oBundle ? oBundle.getText("zp03OwnerFallback") : "Owner";
        },

        formatResultCount: function (iResult, iTotal) {
            iResult = iResult || 0;
            iTotal = iTotal || 0;
            return iResult + " of " + iTotal + " NOCs found";
        },

        formatDate: function (sISO) {
            if (!sISO) {
                return "—";
            }
            var d = new Date(sISO + "T00:00:00");
            if (isNaN(d.getTime())) {
                return sISO;
            }
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        },

        formatEntities: function (aEntities) {
            if (!aEntities || !aEntities.length) {
                return "—";
            }
            return aEntities.join(", ");
        },

        formatStatusBadge: function (sStatus) {
            var s = String(sStatus || "").toUpperCase();
            var sLabel = s ? s.charAt(0) + s.slice(1).toLowerCase() : "Unknown";
            var sMod = "neutral";
            if (s === "ACTIVE") { sMod = "active"; }
            if (s === "EXPIRED") { sMod = "expired"; }
            if (s === "CANCELLED") { sMod = "cancelled"; }
            return "<span class=\"zp03Badge zp03Badge--" + sMod + "\">" + sLabel + "</span>";
        },

        formatEligibilityBadge: function (sEligibility) {
            var s = String(sEligibility || "").toUpperCase();
            if (s === "ELIGIBLE") {
                return "<span class=\"zp03Badge zp03Badge--eligible\">Eligible</span>";
            }
            return "<span class=\"zp03Badge zp03Badge--notEligible\">Not eligible</span>";
        }
    });
});
