"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPendingRole = exports.onUserCreate = void 0;
// Ensure firebase-admin is initialized before any function module runs.
require("./admin");
var onUserCreate_1 = require("./auth/onUserCreate");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return onUserCreate_1.onUserCreate; } });
var setPendingRole_1 = require("./auth/setPendingRole");
Object.defineProperty(exports, "setPendingRole", { enumerable: true, get: function () { return setPendingRole_1.setPendingRole; } });
//# sourceMappingURL=index.js.map