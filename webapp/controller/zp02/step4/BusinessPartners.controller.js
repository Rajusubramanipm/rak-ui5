sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "rak/services/service/zp02/ReferenceDataService",
    "rak/services/service/zp02/EngineerService",
    "rak/services/service/zp02/ContractorService",
    "rak/services/service/zp02/EweConsultantService"
], function (Controller, JSONModel, MessageToast, MessageBox,
             ReferenceDataService, EngineerService, ContractorService, EweConsultantService) {
    "use strict";

    var STEP_LABELS = [
        "Select Project",
        "Permit Information",
        "Fences & Buildings",
        "Business Partners",
        "Attachments",
        "Summary"
    ];

    // Mobile number format: 971 XX XXXXXXX (e.g. "971 50 0000000")
    var MOBILE_REGEX = /^971 \d{2} \d{7}$/;

    function _uuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function _emptyEngineerRow(sSpecialityKey, sSpecialityText, bRequired) {
        return {
            rowId:              _uuid(),
            specialityKey:      sSpecialityKey || "",
            specialityText:     sSpecialityText || "",
            isRequired:         !!bRequired,
            engineerId:         "",
            engineerName:       "",
            mobile:             "",
            mobileError:        "",
            availableEngineers: []
        };
    }

    function _initialEngineers() {
        return [
            _emptyEngineerRow("ARCHITECT",  "Architect",  true),
            _emptyEngineerRow("STRUCTURAL", "Structural", true)
        ];
    }

    return Controller.extend("rak.services.controller.zp02.step4.BusinessPartners", {

        /* ══════════════════════════════════════════════════════════════
           LIFECYCLE
           ══════════════════════════════════════════════════════════════ */

        onInit: function () {
            this._allEngineers = [];

            var oViewModel = new JSONModel({
                activeStep:                    4,
                stepLabels:                    STEP_LABELS,
                project:                       { ownerName: "", projectNumber: "", address: "" },
                specialities:                  [],
                contractorIdentificationTypes: [],
                engineers:                     _initialEngineers(),
                addEngineerLabel:              "Add Engineer",
                // Contractor
                contractorSearchVisible:       true,
                contractorResultVisible:       false,
                contractorSearchType:          "TRADE_LICENSE",
                contractorSearchValue:         "",
                contractorSearchError:         "",
                contractorResult:              {
                    contractorNo:       "",
                    name:               "",
                    tradeLicenceNo:     "",
                    tradeLicenceExpiry: "",
                    registrationExpiry: ""
                },
                // EWE
                eweSearchVisible:        true,
                eweResultVisible:        false,
                eweSearchValue:          "",
                eweSearchEnabled:        true,
                eweSearchError:          "",
                eweResults:              [],
                eweResult:               { name: "", licenceNo: "" },
                applicantAvailableInEwe: true,
                eweSameAsApplicant:      false,
                // Validation
                validationErrors: { architect: "", structural: "", eweConsultant: "" }
            });

            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-business-partners")
                .attachPatternMatched(this._onRouteMatched, this);
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

            this._loadContext(oProject);
            this._loadReferenceData();
            this._syncFromAppState();
            this._clearValidationErrors();
            setTimeout(function () {
                if (document.activeElement && document.activeElement.blur && document.activeElement.classList.contains("rakPermitAction")) {
                    document.activeElement.blur();
                }
            }, 60);
        },

        _loadContext: function (oProject) {
            this.getView().getModel("view").setProperty("/project", {
                ownerName:     oProject.ownerName     || "Abdullah Al-Aziz",
                projectNumber: oProject.parcelId      || oProject.projectNumber || "409030901",
                address:       oProject.address       || "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
            });
        },

        _loadReferenceData: function () {
            var oViewModel = this.getView().getModel("view");
            var that       = this;
            Promise.all([
                ReferenceDataService.getSpecialities(),
                ReferenceDataService.getContractorIdentificationTypes(),
                EngineerService.getAll()
            ]).then(function (results) {
                oViewModel.setProperty("/specialities",                  results[0]);
                oViewModel.setProperty("/contractorIdentificationTypes", results[1]);
                that._allEngineers = results[2] || [];
                that._refreshAllAvailableEngineers();
            }).catch(function (err) {
                MessageToast.show("Error loading reference data: " + err.message);
            });
        },

        /* ══════════════════════════════════════════════════════════════
           APP STATE SYNC
           ══════════════════════════════════════════════════════════════ */

        _syncFromAppState: function () {
            var oAppState  = this.getOwnerComponent().getModel("appState");
            var oStep4     = oAppState.getProperty("/step4") || {};
            var oViewModel = this.getView().getModel("view");

            // Restore engineer rows (merge domain + UI structure)
            var aSaved = oStep4.engineers || [];
            if (aSaved.length === 0) {
                oViewModel.setProperty("/engineers", _initialEngineers());
            } else {
                var aRows = aSaved.map(function (row) {
                    return {
                        rowId:              row.rowId       || _uuid(),
                        specialityKey:      row.specialityKey  || "",
                        specialityText:     row.specialityText || "",
                        isRequired:         !!row.isRequired,
                        engineerId:         row.engineerId  || "",
                        engineerName:       row.engineerName || "",
                        mobile:             row.mobile      || "",
                        mobileError:        "",
                        availableEngineers: []
                    };
                });
                oViewModel.setProperty("/engineers", aRows);
            }

            // Restore contractor
            var oContractor = oStep4.contractor || null;
            if (oContractor) {
                oViewModel.setProperty("/contractorSearchVisible", false);
                oViewModel.setProperty("/contractorResultVisible", true);
                oViewModel.setProperty("/contractorResult", {
                    contractorNo:       oContractor.contractorNo       || "",
                    name:               oContractor.name               || "",
                    tradeLicenceNo:     oContractor.tradeLicenceNo     || "",
                    tradeLicenceExpiry: oContractor.tradeLicenceExpiry || "",
                    registrationExpiry: oContractor.registrationExpiry || ""
                });
            } else {
                oViewModel.setProperty("/contractorSearchVisible", true);
                oViewModel.setProperty("/contractorResultVisible", false);
                oViewModel.setProperty("/contractorSearchValue",   "");
                oViewModel.setProperty("/contractorSearchError",   "");
            }

            // Restore EWE
            var oEwe = oStep4.eweConsultant || null;
            if (oEwe) {
                oViewModel.setProperty("/eweSearchVisible",  false);
                oViewModel.setProperty("/eweResultVisible",  true);
                oViewModel.setProperty("/eweResult", {
                    name:      oEwe.name      || "",
                    licenceNo: oEwe.licenceNo || ""
                });
            } else {
                oViewModel.setProperty("/eweSearchVisible",    true);
                oViewModel.setProperty("/eweResultVisible",    false);
                oViewModel.setProperty("/eweSearchValue",      "");
                oViewModel.setProperty("/eweSearchError",      "");
                oViewModel.setProperty("/eweResults",          []);
            }

            // Restore same-as-applicant flag
            var bSame = !!oStep4.eweSameAsApplicant;
            oViewModel.setProperty("/eweSameAsApplicant", bSame);
            oViewModel.setProperty("/eweSearchEnabled",   !bSame);

            this._refreshAddEngineerLabel();
            this._refreshAllAvailableEngineers();
        },

        _syncToAppState: function () {
            var oViewModel = this.getView().getModel("view");
            var oAppState  = this.getOwnerComponent().getModel("appState");

            var aEngineers = (oViewModel.getProperty("/engineers") || []).map(function (row) {
                return {
                    rowId:         row.rowId,
                    specialityKey: row.specialityKey,
                    specialityText: row.specialityText,
                    isRequired:    row.isRequired,
                    engineerId:    row.engineerId,
                    engineerName:  row.engineerName,
                    mobile:        row.mobile
                };
            });

            var bResultVisible = oViewModel.getProperty("/contractorResultVisible");
            var oContractor = bResultVisible ? {
                contractorId:       null,
                contractorNo:       oViewModel.getProperty("/contractorResult/contractorNo"),
                name:               oViewModel.getProperty("/contractorResult/name"),
                tradeLicenceNo:     oViewModel.getProperty("/contractorResult/tradeLicenceNo"),
                tradeLicenceExpiry: oViewModel.getProperty("/contractorResult/tradeLicenceExpiry"),
                registrationExpiry: oViewModel.getProperty("/contractorResult/registrationExpiry")
            } : null;

            var bEweVisible = oViewModel.getProperty("/eweResultVisible");
            var oEwe = bEweVisible ? {
                consultantId: null,
                name:         oViewModel.getProperty("/eweResult/name"),
                licenceNo:    oViewModel.getProperty("/eweResult/licenceNo")
            } : null;

            oAppState.setProperty("/step4", {
                engineers:          aEngineers,
                contractor:         oContractor,
                eweConsultant:      oEwe,
                eweSameAsApplicant: oViewModel.getProperty("/eweSameAsApplicant")
            });
        },

        /* ══════════════════════════════════════════════════════════════
           ENGINEER HELPERS
           ══════════════════════════════════════════════════════════════ */

        _refreshAllAvailableEngineers: function () {
            var oViewModel = this.getView().getModel("view");
            var aRows      = oViewModel.getProperty("/engineers") || [];
            var aAll       = this._allEngineers || [];
            if (aAll.length === 0) { return; }

            // Collect all currently assigned engineerIds
            var aAssigned = aRows
                .filter(function (r) { return !!r.engineerId; })
                .map(function (r) { return r.engineerId; });

            aRows.forEach(function (row, idx) {
                var sKey = row.specialityKey;
                var aFiltered = aAll
                    .filter(function (e) { return e.specialityKey === sKey; })
                    .filter(function (e) {
                        // Keep current row's own selection; exclude engineers assigned in other rows
                        return e.engineerId === row.engineerId ||
                               aAssigned.indexOf(e.engineerId) === -1;
                    });
                // Blank "Search" entry at top
                var aWithBlank = [{ engineerId: "", name: "Search" }].concat(aFiltered);
                oViewModel.setProperty("/engineers/" + idx + "/availableEngineers", aWithBlank);
            });
        },

        _refreshAddEngineerLabel: function () {
            var oViewModel  = this.getView().getModel("view");
            var aEngineers  = oViewModel.getProperty("/engineers") || [];
            var bHasOptional = aEngineers.some(function (r) { return !r.isRequired; });
            oViewModel.setProperty("/addEngineerLabel",
                bHasOptional ? "Add another Engineer" : "Add Engineer");
        },

        _getText: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        },

        /* ══════════════════════════════════════════════════════════════
           ENGINEER EVENTS
           ══════════════════════════════════════════════════════════════ */

        onAddEngineer: function () {
            var oViewModel = this.getView().getModel("view");
            var aEngineers = oViewModel.getProperty("/engineers") || [];
            var oNew       = _emptyEngineerRow("ARCHITECT", "Architect", false);
            // Blank available list until _refreshAllAvailableEngineers populates it
            oNew.availableEngineers = [{ engineerId: "", name: "Search" }];
            aEngineers.push(oNew);
            oViewModel.setProperty("/engineers", aEngineers);
            this._refreshAddEngineerLabel();
            this._refreshAllAvailableEngineers();
        },

        onSpecialityChange: function (oEvent) {
            var oSource    = oEvent.getSource();
            var sKey       = oSource.getSelectedKey();
            var oItem      = oSource.getSelectedItem();
            var sText      = oItem ? oItem.getText() : "";

            var oContext   = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath      = oContext.getPath();
            var idx        = parseInt(sPath.replace("/engineers/", ""), 10);
            var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/engineers/" + idx + "/specialityKey",  sKey);
            oViewModel.setProperty("/engineers/" + idx + "/specialityText", sText);
            // Clear engineer selection when speciality changes
            oViewModel.setProperty("/engineers/" + idx + "/engineerId",   "");
            oViewModel.setProperty("/engineers/" + idx + "/engineerName", "");
            oViewModel.setProperty("/engineers/" + idx + "/mobile",       "");
            oViewModel.setProperty("/engineers/" + idx + "/mobileError",  "");

            this._refreshAllAvailableEngineers();
            this._syncToAppState();
        },

        onEngineerSelected: function (oEvent) {
            var oSource     = oEvent.getSource();
            var sEngineerId = oSource.getSelectedKey();
            var oContext    = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath       = oContext.getPath();
            var idx         = parseInt(sPath.replace("/engineers/", ""), 10);
            var oViewModel  = this.getView().getModel("view");
            var aRows       = oViewModel.getProperty("/engineers") || [];

            if (!sEngineerId) {
                oViewModel.setProperty("/engineers/" + idx + "/engineerId",   "");
                oViewModel.setProperty("/engineers/" + idx + "/engineerName", "");
                oViewModel.setProperty("/engineers/" + idx + "/mobile",       "");
                oViewModel.setProperty("/engineers/" + idx + "/mobileError",  "");
                this._refreshAllAvailableEngineers();
                this._syncToAppState();
                return;
            }

            // Duplicate check: same engineerId must not appear in any OTHER row
            var bDuplicate = aRows.some(function (row, i) {
                return i !== idx && row.engineerId === sEngineerId;
            });

            if (bDuplicate) {
                oSource.setSelectedKey(aRows[idx].engineerId || "");
                MessageBox.error(this._getText("step4ValDuplicateEngineer"));
                return;
            }

            // Find the engineer record
            var oEngineer = (this._allEngineers || []).filter(function (e) {
                return e.engineerId === sEngineerId;
            })[0];

            oViewModel.setProperty("/engineers/" + idx + "/engineerId",   sEngineerId);
            oViewModel.setProperty("/engineers/" + idx + "/engineerName", oEngineer ? oEngineer.name   : "");
            oViewModel.setProperty("/engineers/" + idx + "/mobile",       oEngineer ? oEngineer.mobile : "");
            oViewModel.setProperty("/engineers/" + idx + "/mobileError",  "");

            this._refreshAllAvailableEngineers();
            this._syncToAppState();
        },

        onMobileChange: function (oEvent) {
            var oSource  = oEvent.getSource();
            var sVal     = (oSource.getValue() || "").trim();
            var oContext = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath    = oContext.getPath();
            var idx      = parseInt(sPath.replace("/engineers/", ""), 10);
            var oViewModel = this.getView().getModel("view");
            var sEngineerId = oViewModel.getProperty("/engineers/" + idx + "/engineerId");

            if (sEngineerId && !sVal) {
                // Engineer selected + mobile cleared → required (MSG-V01)
                oViewModel.setProperty("/engineers/" + idx + "/mobileError",
                    this._getText("msgV01Required"));
            } else if (sVal && !MOBILE_REGEX.test(sVal)) {
                // Non-empty but wrong format (MSG-V03)
                oViewModel.setProperty("/engineers/" + idx + "/mobileError",
                    this._getText("msgV03Format"));
            } else {
                oViewModel.setProperty("/engineers/" + idx + "/mobileError", "");
                oViewModel.setProperty("/engineers/" + idx + "/mobile", sVal);
                this._syncToAppState();
            }
        },

        onDeleteEngineer: function (oEvent) {
            var oSource  = oEvent.getSource();
            var oContext = oSource.getBindingContext("view");
            if (!oContext) { return; }
            var sPath    = oContext.getPath();
            var idx      = parseInt(sPath.replace("/engineers/", ""), 10);
            var oViewModel = this.getView().getModel("view");
            var aEngineers = oViewModel.getProperty("/engineers") || [];

            if (aEngineers[idx] && aEngineers[idx].isRequired) { return; }
            aEngineers.splice(idx, 1);
            oViewModel.setProperty("/engineers", aEngineers);
            this._refreshAddEngineerLabel();
            this._refreshAllAvailableEngineers();
            this._syncToAppState();
        },

        /* ══════════════════════════════════════════════════════════════
           CONTRACTOR EVENTS
           ══════════════════════════════════════════════════════════════ */

        onContractorTypeChange: function (oEvent) {
            var sKey       = oEvent.getSource().getSelectedKey();
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/contractorSearchType",  sKey);
            oViewModel.setProperty("/contractorSearchValue", "");
            oViewModel.setProperty("/contractorSearchError", "");
        },

        onFindContractor: function () {
            var oViewModel = this.getView().getModel("view");
            var sType      = oViewModel.getProperty("/contractorSearchType");
            var sValue     = (oViewModel.getProperty("/contractorSearchValue") || "").trim();
            var that       = this;

            oViewModel.setProperty("/contractorSearchError", "");

            if (!sValue) { return; }

            if (sType === "TRADE_LICENSE") {
                // Digits-only validation
                if (!/^\d+$/.test(sValue)) {
                    oViewModel.setProperty("/contractorSearchError",
                        this._getText("step4ValDigitsOnly"));
                    return;
                }
                ContractorService.findByTradeLicence(sValue).then(function (oResult) {
                    if (!oResult) {
                        oViewModel.setProperty("/contractorSearchError",
                            that._getText("msgF02NoContractorFound"));
                    } else {
                        that._applyContractorResult(oResult);
                    }
                });
            } else {
                // CONTRACTOR_NAME: text search
                ContractorService.findByName(sValue).then(function (aResults) {
                    if (!aResults || aResults.length === 0) {
                        oViewModel.setProperty("/contractorSearchError",
                            that._getText("step4ValNoNameResult"));
                    } else {
                        that._applyContractorResult(aResults[0]);
                    }
                });
            }
        },

        _applyContractorResult: function (oContractor) {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/contractorResult", {
                contractorNo:       oContractor.contractorNo       || "",
                name:               oContractor.name               || "",
                tradeLicenceNo:     oContractor.tradeLicenceNo     || "",
                tradeLicenceExpiry: oContractor.tradeLicenceExpiry || "",
                registrationExpiry: oContractor.registrationExpiry || ""
            });
            oViewModel.setProperty("/contractorSearchVisible", false);
            oViewModel.setProperty("/contractorResultVisible", true);
            oViewModel.setProperty("/contractorSearchError",   "");
            this._syncToAppState();
        },

        onResumeContractorSearch: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/contractorSearchVisible", true);
            oViewModel.setProperty("/contractorResultVisible", false);
            oViewModel.setProperty("/contractorSearchValue",   "");
            oViewModel.setProperty("/contractorSearchError",   "");
            // Clear from domain state but do not wipe until replacement is confirmed
            this.getOwnerComponent().getModel("appState").setProperty("/step4/contractor", null);
        },

        /* ══════════════════════════════════════════════════════════════
           EWE CONSULTANT EVENTS
           ══════════════════════════════════════════════════════════════ */

        onSearchEwe: function () {
            var oViewModel = this.getView().getModel("view");
            var sQuery     = (oViewModel.getProperty("/eweSearchValue") || "").trim();
            var that       = this;

            oViewModel.setProperty("/eweSearchError", "");
            oViewModel.setProperty("/eweResults",     []);

            EweConsultantService.search(sQuery).then(function (aResults) {
                if (!aResults || aResults.length === 0) {
                    oViewModel.setProperty("/eweSearchError",
                        that._getText("step4ValEweRequired"));
                } else {
                    oViewModel.setProperty("/eweResults", aResults);
                }
            });
        },

        onEweResultSelected: function (oEvent) {
            var oContext   = oEvent.getSource().getBindingContext("view");
            if (!oContext) { return; }
            var oResult    = oContext.getObject();
            var oViewModel = this.getView().getModel("view");

            oViewModel.setProperty("/eweResult", {
                name:      oResult.name      || "",
                licenceNo: oResult.licenceNo || ""
            });
            oViewModel.setProperty("/eweSearchVisible", false);
            oViewModel.setProperty("/eweResultVisible", true);
            oViewModel.setProperty("/eweResults",       []);
            oViewModel.setProperty("/eweSearchError",   "");
            this._syncToAppState();
        },

        onResumeEweSearch: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/eweSearchVisible",    true);
            oViewModel.setProperty("/eweResultVisible",    false);
            oViewModel.setProperty("/eweSearchValue",      "");
            oViewModel.setProperty("/eweSearchError",      "");
            oViewModel.setProperty("/eweResults",          []);
            oViewModel.setProperty("/eweSameAsApplicant",  false);
            oViewModel.setProperty("/eweSearchEnabled",    true);
            this.getOwnerComponent().getModel("appState").setProperty("/step4/eweConsultant", null);
            this.getOwnerComponent().getModel("appState").setProperty("/step4/eweSameAsApplicant", false);
        },

        onEweSameAsApplicantChange: function (oEvent) {
            var bSelected  = oEvent.getParameter("selected");
            var oViewModel = this.getView().getModel("view");
            var that       = this;

            oViewModel.setProperty("/eweSameAsApplicant", bSelected);

            if (bSelected) {
                oViewModel.setProperty("/eweSearchEnabled", false);
                EweConsultantService.getApplicantAsConsultant().then(function (oApplicant) {
                    oViewModel.setProperty("/eweResult", {
                        name:      oApplicant.name      || "",
                        licenceNo: oApplicant.licenceNo || ""
                    });
                    oViewModel.setProperty("/eweSearchVisible", false);
                    oViewModel.setProperty("/eweResultVisible", true);
                    oViewModel.setProperty("/eweResults",       []);
                    oViewModel.setProperty("/eweSearchError",   "");
                    that._syncToAppState();
                });
            } else {
                oViewModel.setProperty("/eweSearchEnabled",   true);
                oViewModel.setProperty("/eweSearchVisible",   true);
                oViewModel.setProperty("/eweResultVisible",   false);
                oViewModel.setProperty("/eweResult",          { name: "", licenceNo: "" });
                this.getOwnerComponent().getModel("appState").setProperty("/step4/eweConsultant", null);
                this.getOwnerComponent().getModel("appState").setProperty("/step4/eweSameAsApplicant", false);
            }
        },

        /* ══════════════════════════════════════════════════════════════
           VALIDATION
           ══════════════════════════════════════════════════════════════ */

        _clearValidationErrors: function () {
            this.getView().getModel("view").setProperty("/validationErrors", {
                architect: "", structural: "", eweConsultant: ""
            });
        },

        _isStep4Valid: function () {
            var oViewModel  = this.getView().getModel("view");
            var aEngineers  = oViewModel.getProperty("/engineers") || [];
            var bEweVisible = oViewModel.getProperty("/eweResultVisible");
            var oErrors     = { architect: "", structural: "", eweConsultant: "" };
            var bValid      = true;
            var that        = this;

            // Per-row: mobile required and valid when engineer is assigned
            aEngineers.forEach(function (row, idx) {
                if (!row.engineerId) { return; }
                if (!row.mobile) {
                    oViewModel.setProperty("/engineers/" + idx + "/mobileError",
                        that._getText("msgV01Required"));
                    bValid = false;
                } else if (!MOBILE_REGEX.test(row.mobile)) {
                    oViewModel.setProperty("/engineers/" + idx + "/mobileError",
                        that._getText("msgV03Format"));
                    bValid = false;
                }
            });

            var bArch = aEngineers.some(function (row) {
                return row.specialityKey === "ARCHITECT" && !!row.engineerId;
            });
            var bStr  = aEngineers.some(function (row) {
                return row.specialityKey === "STRUCTURAL" && !!row.engineerId;
            });

            if (!bArch) {
                oErrors.architect = this._getText("step4ValArchitectRequired");
                bValid = false;
            }
            if (!bStr) {
                oErrors.structural = this._getText("step4ValStructuralRequired");
                bValid = false;
            }
            if (!bEweVisible) {
                oErrors.eweConsultant = this._getText("step4ValEweRequired");
                bValid = false;
            }

            oViewModel.setProperty("/validationErrors", oErrors);
            return bValid;
        },

        /* ══════════════════════════════════════════════════════════════
           NAVIGATION
           ══════════════════════════════════════════════════════════════ */

        onNext: function () {
            if (!this._isStep4Valid()) { return; }
            this._syncToAppState();
            this.getOwnerComponent().getRouter().navTo("zp02-attachments");
        },

        onBack: function () {
            this._syncToAppState();
            this.getOwnerComponent().getRouter().navTo("zp02-fences-buildings");
        },

        onSaveDraft: function () {
            this._syncToAppState();
            MessageToast.show(this._getText("msgC03SaveDraftSuccess"));
        },

        onDelete: function () {
            var that = this;
            MessageBox.confirm(this._getText("msgC01DeleteConfirm"), {
                title:   this._getText("msgC01DeleteConfirmTitle"),
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that.getOwnerComponent().getRouter().navTo("zp02-project-selection");
                    }
                }
            });
        }

    });
});
