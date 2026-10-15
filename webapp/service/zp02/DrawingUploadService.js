sap.ui.define([
    "rak/services/service/zp02/adapter/MockDrawingUploadAdapter"
], function (Adapter) {
    "use strict";

    return {

        getDrawingGroups: function () {
            return Adapter.getGroups();
        },

        getDepartmentNote: function (sGroupKey) {
            return Adapter.getDeptNote(sGroupKey);
        },

        validateFileMetadata: function (oMeta) {
            return Adapter.validateFile(oMeta);
        },

        simulateUpload: function (fnProgress, fnComplete) {
            return Adapter.simulateUpload(fnProgress, fnComplete);
        },

        saveGroup: function (sGroupKey, oGroupData) {
            return Adapter.saveGroup(sGroupKey, oGroupData);
        },

        submitGroup: function (sGroupKey, oGroupData) {
            return Adapter.submitGroup(sGroupKey, oGroupData);
        },

        getSubmissionGuide: function () {
            return Adapter.getSubmissionGuide();
        }

    };
});
