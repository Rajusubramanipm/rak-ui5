sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/ActionSheet",
    "sap/m/Button",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "rak/services/service/zp02/ReferenceDataService"
], function (Controller, JSONModel, MessageToast, MessageBox, ActionSheet, Button, Filter, FilterOperator, ReferenceDataService) {
    "use strict";

    /* ── STRUCTURAL_FEATURE_MIN_SELECTION = frontend assumption pending business clarification.
          Individual options are optional. Group is rendered; no minimum selection is enforced.
          Override this decision if BRD/Figma is later confirmed to require at least one. ── */

    var STEP_LABELS = [
        "Select Project",
        "Permit Information",
        "Fences & Buildings",
        "Business Partners",
        "Attachments",
        "Summary"
    ];

    var FLOOR_ABBR = [
        { key: "basement",    abbr: "B"    },
        { key: "lowerGround", abbr: "LG"   },
        { key: "groundUpper", abbr: "G"    },
        { key: "mezzanine",   abbr: "M"    },
        { key: "typical",     abbr: "F"    },
        { key: "unique",      abbr: "U"    },
        { key: "roof",        abbr: "R"    },
        { key: "podium",      abbr: "P"    },
        { key: "penthouse",   abbr: "Pent" },
        { key: "helipads",    abbr: "H"    },
        { key: "service",     abbr: "S"    }
    ];

    function _uuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function _emptyDialogDraft() {
        return {
            buildingId:               null,
            buildingTypeCode:         "",
            buildingTypeText:         "",
            usageTypeKeys:            [],
            usageTypeTexts:           [],
            numberOfTypicalBuildings: 1,
            buildingName:             "",
            floors: {
                basement:    0,
                lowerGround: 0,
                groundUpper: 1,
                mezzanine:   0,
                typical:     1,
                unique:      0,
                roof:        0,
                podium:      0,
                penthouse:   0,
                helipads:    0,
                service:     0
            },
            structural: {
                buildingHeight:       "",
                expansionJoints:      0,
                buildingShapeCode:    "",
                foundationTypeCode:   "",
                slabSystemCode:       "SS-03",
                featTransferElements: false,
                featFloorNonTypicality: false,
                featFrames:           false,
                featThirdPartyDesign: false,
                featOutriggers:       false
            }
        };
    }

    function _emptyDialogErrors() {
        return {
            buildingType:   "",
            usageType:      "",
            buildingHeight: "",
            buildingShape:  "",
            foundationType: "",
            slabSystem:     ""
        };
    }

    function _emptyFenceForm() {
        return { fenceTypeCode: "", length: "", height: "", numberOfGates: "" };
    }

    function _emptyFenceErrors() {
        return { fenceType: "", length: "", height: "", numberOfGates: "" };
    }

    function _isPositiveNumber(sVal) {
        var n = parseFloat(sVal);
        return !isNaN(n) && n > 0 && /^\d+(\.\d{1,2})?$/.test(String(sVal).trim());
    }

    function _isNonNegativeInteger(sVal) {
        var n = parseInt(sVal, 10);
        return !isNaN(n) && n >= 0 && /^\d+$/.test(String(sVal).trim());
    }

    return Controller.extend("rak.services.controller.zp02.step3.FencesBuildings", {

        /* ══════════════════════════════════════════════════════════════
           LIFECYCLE
           ══════════════════════════════════════════════════════════════ */

        onInit: function () {
            var oViewModel = new JSONModel({
                activeStep:          3,
                stepLabels:          STEP_LABELS,
                project:             { ownerName: "", projectNumber: "", address: "", projectId: "" },
                buildingTypes:       [],
                usageTypeOptions:    [],
                buildingShapes:      [],
                foundationTypes:     [],
                slabSystems:         [],
                fenceTypes:          [],
                availableFenceTypes: [],
                buildings:           [],
                fences:              [],
                stepError:           "",
                fenceFormVisible:    false,
                fenceAddEnabled:     true,
                fenceForm:           _emptyFenceForm(),
                fenceErrors:         _emptyFenceErrors(),
                dialog: {
                    open:         false,
                    mode:         "add",
                    editingBuildingId: null,
                    currentStep:  1,
                    stepIndicator: "Step 1 of 3: General Information",
                    title:        "Add Building",
                    uniqueEnabled: false,
                    usageTypeEnabled: false,
                    draft:        _emptyDialogDraft(),
                    errors:       _emptyDialogErrors()
                }
            });

            this.getView().setModel(oViewModel, "view");

            this.getOwnerComponent().getRouter()
                .getRoute("zp02-fences-buildings")
                .attachPatternMatched(this._onRouteMatched, this);

            this._attachPickerStyling();
        },

        /* ══════════════════════════════════════════════════════════════
           PRESENTATION — scoped styling hooks (no behaviour change)
           ══════════════════════════════════════════════════════════════ */

        /**
         * Select / MultiComboBox dropdowns render their list in a Popover in the
         * static UI area, outside .zp02Step3 / .zp02BuildingDialog. Tag those
         * pickers with a scoped class so the Figma open-state styling (137:11930,
         * 363:10485) applies to Step 3 dropdowns only. The picker can be created
         * lazily, so re-tag after rendering and on focus (before it can open).
         */
        _attachPickerStyling: function () {
            var fnTag = function (oCtrl) {
                var oPicker = oCtrl.getPicker && oCtrl.getPicker();
                if (oPicker && !oPicker.hasStyleClass("zp02SelectPicker")) {
                    oPicker.addStyleClass("zp02SelectPicker");
                }
            };
            this.getView().findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA("sap.m.Select") || oCtrl.isA("sap.m.MultiComboBox");
            }).forEach(function (oCtrl) {
                // Delegates run after the control's own handler, so the picker a
                // click / F4 / Alt+Down just created is already there to tag.
                oCtrl.addEventDelegate({
                    onAfterRendering: function () { fnTag(oCtrl); },
                    onfocusin:        function () { fnTag(oCtrl); },
                    onclick:          function () { fnTag(oCtrl); },
                    onsapshow:        function () { fnTag(oCtrl); },
                    onsapexpand:      function () { fnTag(oCtrl); }
                });
            });
        },

        onBuildingDialogAfterOpen: function () {
            // Land keyboard focus on the first field rather than the header close icon
            var oFirst = this.getView().getModel("view").getProperty("/dialog/currentStep") === 1
                ? this.byId("selBuildingType") : null;
            if (oFirst) { oFirst.focus(); }
        },

        /** Figma Actions Menu (136:8762): Edit / Delete rows with 20px icons. */
        _createActionMenu: function (aItems) {
            var oSheet = new ActionSheet({
                placement: "Bottom",
                buttons: aItems.map(function (oItem) {
                    return new Button({
                        text: oItem.text,
                        icon: oItem.icon,
                        press: oItem.press
                    });
                })
            });
            oSheet.addStyleClass("zp02ActionMenu");
            this.getView().addDependent(oSheet);
            return oSheet;
        },

        _onRouteMatched: function () {
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oProject  = oAppState ? oAppState.getProperty("/selectedProject") : null;

            if (!oProject) {
                oProject = {
                    projectId: "PRJ-001",
                    parcelId: "202170028",
                    projectNumber: "202170028",
                    ownerName: "Abdullah Al-Aziz",
                    address: "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311"
                };
                if (oAppState) {
                    oAppState.setProperty("/selectedProject", oProject);
                }
            }

            // Init appState.step3 if first visit
            if (!oAppState.getProperty("/step3")) {
                oAppState.setProperty("/step3", { buildings: [], fences: [] });
            }

            this._loadContext(oProject);
            this._syncFromAppState();
            this._loadReferenceData();
            setTimeout(function () {
                if (document.activeElement && document.activeElement.blur && document.activeElement.classList.contains("rakPermitAction")) {
                    document.activeElement.blur();
                }
            }, 60);
        },

        _loadContext: function (oProject) {
            this.getView().getModel("view").setProperty("/project", {
                ownerName:     oProject.ownerName     || "Abdullah Al-Aziz",
                projectNumber: oProject.parcelId      || oProject.projectNumber || "202170028",
                address:       oProject.address       || "AL Muntaser Street, 4th Floor, Eastern Kitchen Building, 4311",
                projectId:     oProject.projectId     || ""
            });
            // Reset step-level error on entry
            this.getView().getModel("view").setProperty("/stepError", "");
        },

        _syncFromAppState: function () {
            var oAppState  = this.getOwnerComponent().getModel("appState");
            var oStep3     = oAppState.getProperty("/step3") || { buildings: [], fences: [] };
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/buildings", oStep3.buildings || []);
            oViewModel.setProperty("/fences",    oStep3.fences    || []);
            this._refreshFenceAddEnabled();
        },

        _syncToAppState: function () {
            var oViewModel = this.getView().getModel("view");
            var oAppState  = this.getOwnerComponent().getModel("appState");
            oAppState.setProperty("/step3", {
                buildings: oViewModel.getProperty("/buildings") || [],
                fences:    oViewModel.getProperty("/fences")    || []
            });
        },

        /**
         * Building Type dropdown <- OData ZEGA_PRM_CASE_SRV /BuildingSet?$filter=Parcel eq '<parcelId>'
         * Distinct BuildingType values become the options. Falls back to mock data on error.
         */
        _readBuildingTypes: function () {
            var oModel   = this.getOwnerComponent().getModel("ZEGA_PRM_CASE");
            var oAppState = this.getOwnerComponent().getModel("appState");
            var oProject = oAppState ? oAppState.getProperty("/selectedProject") : null;
            var sParcel  = oProject ? (oProject.parcelId || "") : "";
            var oBundle  = this.getView().getModel("i18n").getResourceBundle();

            var fnFallback = function () { return ReferenceDataService.getBuildingTypes(); };

            if (!oModel || !sParcel) {
                return fnFallback();
            }

            return new Promise(function (resolve) {
                oModel.read("/BuildingSet", {
                    filters: [new Filter("Parcel", FilterOperator.EQ, '202170028')],
                    success: function (oData) {
                        var mSeen  = {};
                        var aTypes = [];
                        (oData.results || []).forEach(function (o) {
                            var sCode = o.BuildingType;
                            if (sCode && !mSeen[sCode]) {
                                mSeen[sCode] = true;
                                // The service returns only the type code (no description)
                                aTypes.push({ key: sCode, text: sCode });
                            }
                        });
                        aTypes.unshift({ key: "", text: oBundle.getText("step3PlaceholderSelect") });
                        resolve(aTypes);
                    },
                    error: function () {
                        MessageToast.show(oBundle.getText("step3BuildingTypesLoadError"));
                        fnFallback().then(resolve);
                    }
                });
            });
        },

        /**
         * Foundation Type dropdown <- OData ZMUN_PRJ_PRM_SRV /foundTypeSet (default model)
         * founType = key, founDesc = text. Falls back to mock data on error.
         */
        _readFoundationTypes: function () {
            var oModel  = this.getOwnerComponent().getModel();
            var oBundle = this.getView().getModel("i18n").getResourceBundle();

            var fnFallback = function () { return ReferenceDataService.getFoundationTypes(); };

            if (!oModel) {
                return fnFallback();
            }

            return new Promise(function (resolve) {
                oModel.read("/foundTypeSet", {
                    success: function (oData) {
                        var aTypes = (oData.results || []).map(function (o) {
                            return { key: o.founType, text: o.founDesc };
                        });
                        aTypes.unshift({ key: "", text: oBundle.getText("step3PlaceholderSelect") });
                        resolve(aTypes);
                    },
                    error: function () {
                        MessageToast.show(oBundle.getText("step3FoundationTypesLoadError"));
                        fnFallback().then(resolve);
                    }
                });
            });
        },

        /**
         * Fence Type dropdown <- OData ZMUN_PRJ_PRM_SRV /fenceTypeSet (default model)
         * ftype = key, Fdesc = text. Falls back to mock data on error.
         */
        _readFenceTypes: function () {
            var oModel  = this.getOwnerComponent().getModel();
            var oBundle = this.getView().getModel("i18n").getResourceBundle();

            var fnFallback = function () { return ReferenceDataService.getFenceTypes(); };

            if (!oModel) {
                return fnFallback();
            }

            return new Promise(function (resolve) {
                oModel.read("/fenceTypeSet", {
                    success: function (oData) {
                        var aTypes = (oData.results || []).map(function (o) {
                            return { key: o.ftype, text: o.Fdesc };
                        });
                        aTypes.unshift({ key: "", text: oBundle.getText("step3PlaceholderSelect") });
                        resolve(aTypes);
                    },
                    error: function () {
                        MessageToast.show(oBundle.getText("step3FenceTypesLoadError"));
                        fnFallback().then(resolve);
                    }
                });
            });
        },

        _loadReferenceData: function () {
            var oViewModel = this.getView().getModel("view");
            var that       = this;
            Promise.all([
                this._readBuildingTypes(),
                ReferenceDataService.getBuildingShapes(),
                this._readFoundationTypes(),
                ReferenceDataService.getSlabSystems(),
                this._readFenceTypes()
            ]).then(function (results) {
                oViewModel.setProperty("/buildingTypes",    results[0]);
                oViewModel.setProperty("/buildingShapes",   results[1]);
                oViewModel.setProperty("/foundationTypes",  results[2]);
                oViewModel.setProperty("/slabSystems",      results[3]);
                oViewModel.setProperty("/fenceTypes",       results[4]);
                that._refreshAvailableFenceTypes();
                that._refreshFenceAddEnabled();
            }).catch(function (err) {
                MessageToast.show("Error loading reference data: " + err.message);
            });
        },

        /* ══════════════════════════════════════════════════════════════
           REFERENCE DATA HELPERS
           ══════════════════════════════════════════════════════════════ */

        _refreshAvailableFenceTypes: function () {
            var oViewModel    = this.getView().getModel("view");
            var aFenceTypes   = oViewModel.getProperty("/fenceTypes")  || [];
            var aFences       = oViewModel.getProperty("/fences")      || [];
            var aUsedKeys     = aFences.map(function (f) { return f.fenceTypeCode; });

            var aAvailable = aFenceTypes.filter(function (ft) {
                return ft.key === "" || aUsedKeys.indexOf(ft.key) === -1;
            });
            oViewModel.setProperty("/availableFenceTypes", aAvailable);
        },

        _refreshFenceAddEnabled: function () {
            var oViewModel = this.getView().getModel("view");
            var aFences    = oViewModel.getProperty("/fences") || [];
            // One fence record per fence type (excluding the "Select" placeholder)
            var aTypes = (oViewModel.getProperty("/fenceTypes") || []).filter(function (t) { return t.key !== ""; });
            var iMax   = aTypes.length || 3;
            oViewModel.setProperty("/fenceAddEnabled", aFences.length < iMax);
        },

        _getFenceTypeText: function (sKey) {
            var oViewModel = this.getView().getModel("view");
            var aTypes     = oViewModel.getProperty("/fenceTypes") || [];
            var oMatch     = aTypes.filter(function (t) { return t.key === sKey; })[0];
            return oMatch ? oMatch.text : sKey;
        },

        _getBuildingTypeText: function (sKey) {
            var oViewModel = this.getView().getModel("view");
            var aTypes     = oViewModel.getProperty("/buildingTypes") || [];
            var oMatch     = aTypes.filter(function (t) { return t.key === sKey; })[0];
            return oMatch ? oMatch.text : sKey;
        },

        _computeFloorSummary: function (oFloors) {
            var aParts = [];
            FLOOR_ABBR.forEach(function (oMap) {
                var nVal = oFloors[oMap.key] || 0;
                if (nVal > 0) {
                    aParts.push(nVal > 1 ? (nVal + oMap.abbr) : oMap.abbr);
                }
            });
            return aParts.length > 0 ? aParts.join("+") : "-";
        },

        _getBuildingById: function (sId) {
            var aBuildings = this.getView().getModel("view").getProperty("/buildings") || [];
            return aBuildings.filter(function (b) { return b.buildingId === sId; })[0] || null;
        },

        /* ══════════════════════════════════════════════════════════════
           ADD BUILDING DIALOG — OPEN/CLOSE
           ══════════════════════════════════════════════════════════════ */

        onAddBuilding: function () {
            this._openDialog("add", null);
        },

        _openDialog: function (sMode, oBuilding) {
            var oViewModel = this.getView().getModel("view");
            var oDraft     = sMode === "edit" && oBuilding
                ? JSON.parse(JSON.stringify(oBuilding))
                : _emptyDialogDraft();

            var sTitle = sMode === "edit" ? "Edit Building" : "Add Building";

            oViewModel.setProperty("/dialog", {
                open:              true,
                mode:              sMode,
                editingBuildingId: sMode === "edit" ? oBuilding.buildingId : null,
                currentStep:       1,
                stepIndicator:     "Step 1 of 3: General Information",
                title:             sTitle,
                uniqueEnabled:     (oDraft.floors.typical || 0) > 2,
                usageTypeEnabled:  !!(oDraft.buildingTypeCode),
                draft:             oDraft,
                errors:            _emptyDialogErrors()
            });

            // Load usage type options for existing building type
            if (oDraft.buildingTypeCode) {
                this._loadUsageTypes(oDraft.buildingTypeCode);
            } else {
                oViewModel.setProperty("/usageTypeOptions", []);
            }

            this.byId("addBuildingDlg").open();

            // FL08 guards: registered once per open; the delegate re-arms them
            // each time the Floor Composition step renders.
            this._attachFloorNumericGuards();
        },

        onDialogCancel: function () {
            this._closeDialog();
        },

        _closeDialog: function () {
            this.byId("addBuildingDlg").close();
            this.getView().getModel("view").setProperty("/dialog/open", false);
        },

        /* ══════════════════════════════════════════════════════════════
           DIALOG STEP NAVIGATION
           ══════════════════════════════════════════════════════════════ */

        onDialogPrevious: function () {
            var oViewModel = this.getView().getModel("view");
            var nStep      = oViewModel.getProperty("/dialog/currentStep");
            if (nStep <= 1) { return; }
            this._setDialogStep(nStep - 1);
        },

        onDialogNext: function () {
            var oViewModel = this.getView().getModel("view");
            var nStep      = oViewModel.getProperty("/dialog/currentStep");
            if (nStep === 1 && !this._validateDialogStep1()) { return; }
            if (nStep === 2 && !this._validateDialogStep2()) { return; }
            if (nStep >= 3) { return; }
            this._setDialogStep(nStep + 1);
        },

        onDialogSave: function () {
            if (!this._validateDialogStep3()) { return; }
            this._saveBuilding();
            this._closeDialog();
        },

        _setDialogStep: function (nStep) {
            var oViewModel = this.getView().getModel("view");
            var aIndicators = [
                "Step 1 of 3: General Information",
                "Step 2 of 3: Floor Composition",
                "Step 3 of 3: Structural Details"
            ];
            oViewModel.setProperty("/dialog/currentStep",  nStep);
            oViewModel.setProperty("/dialog/stepIndicator", aIndicators[nStep - 1]);
        },

        /**
         * FL08 — show MSG-V04 ("Please enter numbers only.") when a non-numeric
         * character is typed into any editable floor field.
         *
         * The floor fields are sap.m.StepInput, whose inner sap.m.NumericInput
         * silently swallows non-numeric keystrokes, so without this the invalid
         * attempt produces no feedback at all. A render delegate is used because
         * the Floor Composition step is visibility-bound and has no DOM until
         * the user reaches step 2.
         */
        _attachFloorNumericGuards: function () {
            var oStep2 = this.byId("dlgStep2");
            if (!oStep2) { return; }

            var sMsg = this.getView().getModel("i18n").getResourceBundle().getText("msgV04NumbersOnly");
            var that = this;

            (function walk(oCtrl) {
                if (!oCtrl) { return; }
                if (oCtrl.isA && oCtrl.isA("sap.m.StepInput")) {
                    if (!oCtrl._rakNumericDelegate) {
                        oCtrl._rakNumericDelegate = {
                            onAfterRendering: function () { that._guardNumericInput(oCtrl, sMsg); }
                        };
                        oCtrl.addEventDelegate(oCtrl._rakNumericDelegate);
                    }
                    that._guardNumericInput(oCtrl, sMsg);   // already rendered case
                }
                var mAgg = oCtrl.mAggregations || {};
                Object.keys(mAgg).forEach(function (sKey) {
                    var vAgg = mAgg[sKey];
                    if (Array.isArray(vAgg)) { vAgg.forEach(walk); }
                    else if (vAgg && vAgg.getMetadata) { walk(vAgg); }
                });
            })(oStep2);
        },

        _guardNumericInput: function (oStepInput, sMsg) {
            var oDom = oStepInput.getDomRef();
            if (!oDom) { return; }
            var oInput = oDom.querySelector("input");
            if (!oInput || oInput.rakNumericGuard) { return; }
            oInput.rakNumericGuard = true;

            // Must be keydown in the capture phase: sap.m.NumericInput calls
            // preventDefault() on keydown for invalid characters, so keypress
            // never fires for exactly the input this test cares about.
            oInput.addEventListener("keydown", function (oEvt) {
                if (oEvt.ctrlKey || oEvt.metaKey || oEvt.altKey) { return; }
                // Single printable character that is not a digit → invalid entry.
                if (oEvt.key && oEvt.key.length === 1 && !/[0-9]/.test(oEvt.key)) {
                    oStepInput.setValueState("Error");
                    oStepInput.setValueStateText(sMsg);
                }
            }, true);

            // Clear the numbers-only error as soon as the field holds valid digits.
            oInput.addEventListener("input", function () {
                if (/^\d*$/.test(oInput.value) && oStepInput.getValueStateText() === sMsg) {
                    oStepInput.setValueState("None");
                    oStepInput.setValueStateText("");
                }
            });
        },

        /* ══════════════════════════════════════════════════════════════
           DIALOG FIELD EVENTS
           ══════════════════════════════════════════════════════════════ */

        onBuildingTypeChange: function (oEvent) {
            var oViewModel     = this.getView().getModel("view");
            var sKey           = oEvent.getParameter("selectedItem").getKey();
            var sText          = oEvent.getParameter("selectedItem").getText();

            oViewModel.setProperty("/dialog/draft/buildingTypeCode",  sKey);
            oViewModel.setProperty("/dialog/draft/buildingTypeText",  sText);
            oViewModel.setProperty("/dialog/draft/usageTypeKeys",     []);
            oViewModel.setProperty("/dialog/usageTypeEnabled",        !!sKey);
            oViewModel.setProperty("/dialog/errors/buildingType",     "");
            oViewModel.setProperty("/dialog/errors/usageType",        "");

            if (sKey) {
                this._loadUsageTypes(sKey);
            } else {
                oViewModel.setProperty("/usageTypeOptions", []);
            }
        },

        _loadUsageTypes: function (sBuildingTypeCode) {
            var oViewModel = this.getView().getModel("view");
            ReferenceDataService.getUsageTypes(sBuildingTypeCode).then(function (aTypes) {
                oViewModel.setProperty("/usageTypeOptions", aTypes);
            });
        },

        onTypicalFloorsChange: function (oEvent) {
            var oViewModel = this.getView().getModel("view");
            var nTypical   = parseInt(oEvent.getParameter("value"), 10) || 0;
            var bEnabled   = nTypical > 2;

            oViewModel.setProperty("/dialog/uniqueEnabled",             bEnabled);
            oViewModel.setProperty("/dialog/draft/floors/typical",      nTypical);

            if (!bEnabled) {
                oViewModel.setProperty("/dialog/draft/floors/unique", 0);
            } else {
                var nUnique = oViewModel.getProperty("/dialog/draft/floors/unique") || 0;
                if (nUnique > nTypical) {
                    oViewModel.setProperty("/dialog/draft/floors/unique", nTypical);
                }
            }
        },

        onDialogFieldChange: function () {
            // Clear all dialog errors on any field change
            this.getView().getModel("view").setProperty("/dialog/errors", _emptyDialogErrors());
        },

        /* ══════════════════════════════════════════════════════════════
           DIALOG VALIDATION
           ══════════════════════════════════════════════════════════════ */

        _validateDialogStep1: function () {
            var oViewModel = this.getView().getModel("view");
            var oDraft     = oViewModel.getProperty("/dialog/draft");
            var oBundle    = this.getView().getModel("i18n").getResourceBundle();
            var oErrors    = _emptyDialogErrors();
            var bValid     = true;

            if (!(oDraft.buildingTypeCode || "").trim()) {
                oErrors.buildingType = oBundle.getText("msgV02Required");
                bValid = false;
            }

            var aKeys = oDraft.usageTypeKeys || [];
            if (aKeys.length === 0) {
                oErrors.usageType = oBundle.getText("msgV02Required");
                bValid = false;
            }

            oViewModel.setProperty("/dialog/errors", oErrors);
            return bValid;
        },

        _validateDialogStep2: function () {
            // Floor composition: Typical >= 1 enforced by StepInput min. No additional validation needed.
            return true;
        },

        _validateDialogStep3: function () {
            var oViewModel = this.getView().getModel("view");
            var oDraft     = oViewModel.getProperty("/dialog/draft");
            var oBundle    = this.getView().getModel("i18n").getResourceBundle();
            var oErrors    = _emptyDialogErrors();
            var bValid     = true;

            var sHeight = (oDraft.structural.buildingHeight || "").trim();
            if (!sHeight) {
                oErrors.buildingHeight = oBundle.getText("msgV02Required");
                bValid = false;
            } else if (!_isPositiveNumber(sHeight)) {
                oErrors.buildingHeight = oBundle.getText("msgV04NumbersOnly");
                bValid = false;
            }

            if (!(oDraft.structural.buildingShapeCode || "").trim()) {
                oErrors.buildingShape = oBundle.getText("msgV02Required");
                bValid = false;
            }

            if (!(oDraft.structural.foundationTypeCode || "").trim()) {
                oErrors.foundationType = oBundle.getText("msgV02Required");
                bValid = false;
            }

            if (!(oDraft.structural.slabSystemCode || "").trim()) {
                oErrors.slabSystem = oBundle.getText("msgV02Required");
                bValid = false;
            }

            oViewModel.setProperty("/dialog/errors", oErrors);
            return bValid;
        },

        /* ══════════════════════════════════════════════════════════════
           SAVE BUILDING
           ══════════════════════════════════════════════════════════════ */

        _saveBuilding: function () {
            var oViewModel = this.getView().getModel("view");
            var oDraft     = oViewModel.getProperty("/dialog/draft");
            var sMode      = oViewModel.getProperty("/dialog/mode");
            var aBuildings = oViewModel.getProperty("/buildings").slice();

            // Resolve usage type texts
            var aUsageOptions = oViewModel.getProperty("/usageTypeOptions") || [];
            var aUsageKeys    = oDraft.usageTypeKeys || [];
            var aUsageTexts   = aUsageOptions
                .filter(function (o) { return aUsageKeys.indexOf(o.key) !== -1; })
                .map(function (o) { return o.text; });

            var sFloorSummary = this._computeFloorSummary(oDraft.floors);
            var sBaseType     = oDraft.buildingTypeText || this._getBuildingTypeText(oDraft.buildingTypeCode);
            var nTypical      = oDraft.numberOfTypicalBuildings || 1;

            if (sMode === "edit") {
                // Update single record in-place
                var nIdx = aBuildings.findIndex(function (b) {
                    return b.buildingId === oDraft.buildingId;
                });
                if (nIdx !== -1) {
                    var sDisplayName = (oDraft.buildingName || "").trim() || sBaseType;
                    aBuildings[nIdx] = Object.assign({}, oDraft, {
                        displayName:    sDisplayName,
                        usageTypeTexts: aUsageTexts,
                        floorSummary:   sFloorSummary
                    });
                }
            } else {
                // Add mode: create nTypical new records
                for (var i = 1; i <= nTypical; i++) {
                    var sName = (oDraft.buildingName || "").trim() || sBaseType;
                    var sDisplayNameNew = nTypical > 1 ? (sName + " " + i) : sName;
                    aBuildings.push(Object.assign({}, JSON.parse(JSON.stringify(oDraft)), {
                        buildingId:     _uuid(),
                        displayName:    sDisplayNameNew,
                        usageTypeTexts: aUsageTexts,
                        floorSummary:   sFloorSummary
                    }));
                }
            }

            oViewModel.setProperty("/buildings", aBuildings);
            oViewModel.setProperty("/stepError", "");
            this._syncToAppState();
        },

        /* ══════════════════════════════════════════════════════════════
           BUILDING KEBAB MENU
           ══════════════════════════════════════════════════════════════ */

        onBuildingActionsPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oCtx    = oButton.getBindingContext("view");
            this._pressedBuildingId = oCtx.getObject().buildingId;

            if (!this._buildingActionSheet) {
                var oBundle = this.getView().getModel("i18n").getResourceBundle();
                this._buildingActionSheet = this._createActionMenu([
                    { text: oBundle.getText("step3ActionEdit"),   icon: "assets/figma/zp02/step3/icon-edit-pen-20.svg", press: [this._onBuildingEdit,   this] },
                    { text: oBundle.getText("step3ActionDelete"), icon: "assets/figma/zp02/step3/icon-delete-20.svg",   press: [this._onBuildingDelete, this] }
                ]);
            }
            this._buildingActionSheet.openBy(oButton);
        },

        _onBuildingEdit: function () {
            var oBuilding = this._getBuildingById(this._pressedBuildingId);
            if (oBuilding) {
                this._openDialog("edit", oBuilding);
            }
        },

        _onBuildingDelete: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            var that    = this;
            MessageBox.confirm(oBundle.getText("msgC05DeleteBuildingConfirm"), {
                title:            oBundle.getText("msgC05DeleteBuildingTitle"),
                actions:          [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                styleClass:       "zp02MessageBox",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that._deleteBuilding(that._pressedBuildingId);
                    }
                }
            });
        },

        _deleteBuilding: function (sBuildingId) {
            var oViewModel = this.getView().getModel("view");
            var aBuildings = (oViewModel.getProperty("/buildings") || []).filter(function (b) {
                return b.buildingId !== sBuildingId;
            });
            oViewModel.setProperty("/buildings", aBuildings);
            this._syncToAppState();
        },

        /* ══════════════════════════════════════════════════════════════
           FENCE FORM
           ══════════════════════════════════════════════════════════════ */

        onAddFencePress: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/fenceFormVisible", true);
            oViewModel.setProperty("/fenceForm",  _emptyFenceForm());
            oViewModel.setProperty("/fenceErrors", _emptyFenceErrors());
            this._refreshAvailableFenceTypes();
        },

        onAddFenceCancel: function () {
            this.getView().getModel("view").setProperty("/fenceFormVisible", false);
        },

        onFenceFormFieldChange: function () {
            this.getView().getModel("view").setProperty("/fenceErrors", _emptyFenceErrors());
        },

        onAddFenceConfirm: function () {
            if (!this._validateFenceForm()) { return; }

            var oViewModel = this.getView().getModel("view");
            var oForm      = oViewModel.getProperty("/fenceForm");
            var aFences    = (oViewModel.getProperty("/fences") || []).slice();

            aFences.push({
                fenceId:       _uuid(),
                fenceTypeCode: oForm.fenceTypeCode,
                fenceTypeText: this._getFenceTypeText(oForm.fenceTypeCode),
                length:        oForm.length,
                height:        oForm.height,
                numberOfGates: oForm.numberOfGates
            });

            oViewModel.setProperty("/fences",          aFences);
            oViewModel.setProperty("/fenceFormVisible", false);
            oViewModel.setProperty("/fenceForm",        _emptyFenceForm());
            oViewModel.setProperty("/fenceErrors",      _emptyFenceErrors());

            this._refreshAvailableFenceTypes();
            this._refreshFenceAddEnabled();
            this._syncToAppState();
        },

        _validateFenceForm: function () {
            var oViewModel = this.getView().getModel("view");
            var oForm      = oViewModel.getProperty("/fenceForm");
            var oBundle    = this.getView().getModel("i18n").getResourceBundle();
            var oErrors    = _emptyFenceErrors();
            var bValid     = true;

            if (!(oForm.fenceTypeCode || "").trim()) {
                oErrors.fenceType = oBundle.getText("msgV02Required");
                bValid = false;
            } else {
                var aExisting = oViewModel.getProperty("/fences") || [];
                var bDuplicate = aExisting.some(function (f) { return f.fenceTypeCode === oForm.fenceTypeCode; });
                if (bDuplicate) {
                    oErrors.fenceType = oBundle.getText("msgV02Required");
                    bValid = false;
                }
            }

            if (!(oForm.length || "").trim()) {
                oErrors.length = oBundle.getText("msgV02Required");
                bValid = false;
            } else if (!_isPositiveNumber(oForm.length)) {
                oErrors.length = oBundle.getText("msgV04NumbersOnly");
                bValid = false;
            }

            if (!(oForm.height || "").trim()) {
                oErrors.height = oBundle.getText("msgV02Required");
                bValid = false;
            } else if (!_isPositiveNumber(oForm.height)) {
                oErrors.height = oBundle.getText("msgV04NumbersOnly");
                bValid = false;
            }

            if (!(oForm.numberOfGates || "").trim() && oForm.numberOfGates !== "0") {
                oErrors.numberOfGates = oBundle.getText("msgV02Required");
                bValid = false;
            } else if (!_isNonNegativeInteger(oForm.numberOfGates)) {
                oErrors.numberOfGates = oBundle.getText("msgV04NumbersOnly");
                bValid = false;
            }

            oViewModel.setProperty("/fenceErrors", oErrors);
            return bValid;
        },

        /* ══════════════════════════════════════════════════════════════
           FENCE KEBAB MENU
           ══════════════════════════════════════════════════════════════ */

        onFenceActionsPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oCtx    = oButton.getBindingContext("view");
            this._pressedFenceId = oCtx.getObject().fenceId;

            if (!this._fenceActionSheet) {
                // Fences support Delete only (no edit flow exists for fences).
                this._fenceActionSheet = this._createActionMenu([
                    { text: this.getView().getModel("i18n").getResourceBundle().getText("step3ActionDelete"),
                      icon: "assets/figma/zp02/step3/icon-delete-20.svg", press: [this._onFenceDelete, this] }
                ]);
            }
            this._fenceActionSheet.openBy(oButton);
        },

        _onFenceDelete: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            var that    = this;
            MessageBox.confirm(oBundle.getText("msgC04DeleteFenceConfirm"), {
                title:            oBundle.getText("msgC04DeleteFenceTitle"),
                actions:          [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                styleClass:       "zp02MessageBox",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that._deleteFence(that._pressedFenceId);
                    }
                }
            });
        },

        _deleteFence: function (sFenceId) {
            var oViewModel = this.getView().getModel("view");
            var aFences    = (oViewModel.getProperty("/fences") || []).filter(function (f) {
                return f.fenceId !== sFenceId;
            });
            oViewModel.setProperty("/fences", aFences);
            this._refreshAvailableFenceTypes();
            this._refreshFenceAddEnabled();
            this._syncToAppState();
        },

        /* ══════════════════════════════════════════════════════════════
           NAVIGATION
           ══════════════════════════════════════════════════════════════ */

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("zp02-permit-information");
        },

        onNext: function () {
            var oViewModel = this.getView().getModel("view");
            var aBuildings = oViewModel.getProperty("/buildings") || [];
            if (aBuildings.length === 0) {
                var sMsg = this.getView().getModel("i18n").getResourceBundle().getText("msgF03NoBuildingToNext");
                oViewModel.setProperty("/stepError", sMsg);
                return;
            }
            oViewModel.setProperty("/stepError", "");
            // Step 4 is not implemented — navigate to business-partners route (placeholder)
            this.getOwnerComponent().getRouter().navTo("zp02-business-partners");
        },

        onSaveAsDraft: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            this._syncToAppState();
            MessageToast.show(oBundle.getText("msgC03SaveDraftSuccess"));
        },

        onDelete: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            MessageBox.confirm(oBundle.getText("msgC01DeleteConfirm"), {
                title:            oBundle.getText("msgC01DeleteConfirmTitle"),
                actions:          [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                styleClass:       "zp02MessageBox",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Application deleted.");
                    }
                }
            });
        }

    });
});
