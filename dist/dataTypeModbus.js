"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var holdingRegisterAddress;
(function (holdingRegisterAddress) {
    holdingRegisterAddress[holdingRegisterAddress["brightness"] = 0] = "brightness";
    holdingRegisterAddress[holdingRegisterAddress["ck"] = 1] = "ck";
    holdingRegisterAddress[holdingRegisterAddress["brightnessMin"] = 2] = "brightnessMin";
    holdingRegisterAddress[holdingRegisterAddress["brightnessMax"] = 3] = "brightnessMax";
    holdingRegisterAddress[holdingRegisterAddress["ckMin"] = 4] = "ckMin";
    holdingRegisterAddress[holdingRegisterAddress["ckMax"] = 5] = "ckMax";
    holdingRegisterAddress[holdingRegisterAddress["fBleRxEn"] = 6] = "fBleRxEn";
    holdingRegisterAddress[holdingRegisterAddress["onOff"] = 7] = "onOff";
})(holdingRegisterAddress = exports.holdingRegisterAddress || (exports.holdingRegisterAddress = {}));
var holdingRegistersAddress;
(function (holdingRegistersAddress) {
    holdingRegistersAddress[holdingRegistersAddress["ck"] = 0] = "ck";
})(holdingRegistersAddress = exports.holdingRegistersAddress || (exports.holdingRegistersAddress = {}));
var inputregisterAddress;
(function (inputregisterAddress) {
    inputregisterAddress[inputregisterAddress["version"] = 0] = "version";
    inputregisterAddress[inputregisterAddress["lightID"] = 1] = "lightID";
    inputregisterAddress[inputregisterAddress["lightType"] = 2] = "lightType";
    inputregisterAddress[inputregisterAddress["lightMacH"] = 3] = "lightMacH";
    inputregisterAddress[inputregisterAddress["lightMacM"] = 4] = "lightMacM";
    inputregisterAddress[inputregisterAddress["lightMacL"] = 5] = "lightMacL";
    inputregisterAddress[inputregisterAddress["manufactureID"] = 6] = "manufactureID";
    inputregisterAddress[inputregisterAddress["countReadableRegister"] = 10] = "countReadableRegister";
    inputregisterAddress[inputregisterAddress["g0Device000"] = 11] = "g0Device000";
})(inputregisterAddress = exports.inputregisterAddress || (exports.inputregisterAddress = {}));
var typesDevice;
(function (typesDevice) {
    typesDevice[typesDevice["tag"] = 1] = "tag";
    typesDevice[typesDevice["dripStand"] = 2] = "dripStand";
})(typesDevice = exports.typesDevice || (exports.typesDevice = {}));
var deviceLength;
(function (deviceLength) {
    deviceLength[deviceLength["tagLen"] = 24] = "tagLen";
    deviceLength[deviceLength["dripStandLen"] = 30] = "dripStandLen"; //bytes
})(deviceLength = exports.deviceLength || (exports.deviceLength = {}));
var devAddress;
(function (devAddress) {
    devAddress[devAddress["type"] = 0] = "type";
    devAddress[devAddress["seq"] = 1] = "seq";
    devAddress[devAddress["Mac"] = 2] = "Mac";
    devAddress[devAddress["lId1"] = 8] = "lId1";
    devAddress[devAddress["lId2"] = 9] = "lId2";
    devAddress[devAddress["br1"] = 10] = "br1";
    devAddress[devAddress["br2"] = 12] = "br2";
    devAddress[devAddress["rssi"] = 14] = "rssi";
    devAddress[devAddress["Gx"] = 16] = "Gx";
    devAddress[devAddress["Gy"] = 17] = "Gy";
    devAddress[devAddress["Gz"] = 18] = "Gz";
    devAddress[devAddress["batPow"] = 19] = "batPow";
    devAddress[devAddress["labelX"] = 20] = "labelX";
    devAddress[devAddress["labelY"] = 21] = "labelY";
    devAddress[devAddress["labelH"] = 22] = "labelH";
})(devAddress = exports.devAddress || (exports.devAddress = {}));
var otherDripStandAddress;
(function (otherDripStandAddress) {
    otherDripStandAddress[otherDripStandAddress["weight"] = 24] = "weight";
    otherDripStandAddress[otherDripStandAddress["speed"] = 26] = "speed";
    otherDripStandAddress[otherDripStandAddress["time"] = 27] = "time";
})(otherDripStandAddress = exports.otherDripStandAddress || (exports.otherDripStandAddress = {}));
var modbusCmd;
(function (modbusCmd) {
    modbusCmd[modbusCmd["driverInfo"] = 1] = "driverInfo";
    modbusCmd[modbusCmd["location"] = 2] = "location";
})(modbusCmd = exports.modbusCmd || (exports.modbusCmd = {}));
var webCmd;
(function (webCmd) {
    webCmd[webCmd["getTodaylast"] = 1] = "getTodaylast";
    webCmd[webCmd["getTodayAfter"] = 2] = "getTodayAfter";
    webCmd[webCmd["getToday"] = 3] = "getToday";
    webCmd[webCmd["getYesterday"] = 4] = "getYesterday";
    webCmd[webCmd["getDate"] = 5] = "getDate";
    webCmd[webCmd["getDriver"] = 6] = "getDriver";
    webCmd[webCmd["postReset"] = 7] = "postReset";
    webCmd[webCmd["postDimingBrightness"] = 8] = "postDimingBrightness";
    webCmd[webCmd["postDimingCT"] = 9] = "postDimingCT";
    webCmd[webCmd["postDimingXY"] = 10] = "postDimingXY";
    webCmd[webCmd["postSwitchOnOff"] = 11] = "postSwitchOnOff";
    webCmd[webCmd["msgError"] = 404] = "msgError";
})(webCmd = exports.webCmd || (exports.webCmd = {}));
var driverlightType;
(function (driverlightType) {
    driverlightType[driverlightType["none"] = 0] = "none";
    driverlightType[driverlightType["oneColor"] = 1] = "oneColor";
    driverlightType[driverlightType["twoColor"] = 2] = "twoColor";
})(driverlightType = exports.driverlightType || (exports.driverlightType = {}));
//# sourceMappingURL=dataTypeModbus.js.map