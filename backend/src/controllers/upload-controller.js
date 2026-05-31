const fileService = require("../services/upload-service");
const Response = require('../utils/error-handler');

/**
 * uploads media to a particular post
 * @param {uploaded-media} req 
 * @param { 'error-message' } res 
 */
exports.uploadFile = async (req, res) => {
  try {
    const result = await fileService.uploadFile(req);
    if(!result){
      throw new Error("Media can't be added. Please try after sometime.")
    }
    return Response.respondOk(res, result);
  } catch (error) {
    return Response.respondError(res, error)
  }
};

/**
 * returns media
 * @param {mediaUrl} req 
 * @param { 'error-message' } res 
 */
exports.getFile = async (req, res) => {
  try {
    await fileService.getFile(req, res);
  } catch (error) {
    return Response.respondError(res, error)
  }
};
