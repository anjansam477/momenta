const respondOk = (res, result = {}) => {
    res.status(200).send(result);
};

const respondError = (res, error, errorCode = 400) => {
    const errorMapping = {
        [errorMessage.SOMETHING_WENT_WRONG]: statusCodes.InvalidOperation,
        [errorMessage.INVALID_TOKEN]: statusCodes.Unauthorized,
        [errorMessage.LIMIT_EXCEEDED]: statusCodes.TooManyRequests,
        [errorMessage.INVALID_REQUEST]: statusCodes.NotFound,
        [errorMessage.REGISTER_ERROR]: statusCodes.NotFound,
        [errorMessage.NOT_VERIFIED]: statusCodes.Forbidden,
        [errorMessage.INVALID_CREDENTIALS]: statusCodes.NotFound,
        [errorMessage.SESSION_EXPIRED]: statusCodes.Unauthorized,
        [errorMessage.ALREADY_REGISTERED]: statusCodes.Conflict,
        [errorMessage.USER_UNAUTHORIZED]: statusCodes.Forbidden,
        [errorMessage.SEND_MAIL_FAILED]: statusCodes.BadRequest,
        [errorMessage.DOCUMENT_NOT_UPDATED]: statusCodes.InvalidOperation,
        [errorMessage.NOT_REMOVED]: statusCodes.InvalidOperation,
        [errorMessage.DATA_ARCHIVED]: statusCodes.Forbidden,
        [errorMessage.LENGTH_NOT_ALLOWED]: statusCodes.NotSupported,
        [errorMessage.DIRECTORY_NOT_READ]: statusCodes.NotFound,
        [errorMessage.PARAMS_REQUIRED]: statusCodes.BadRequest,
        [errorMessage.NO_ACCESS]: statusCodes.Forbidden,
        [errorMessage.ACCOUNT_BLOCKED]:statusCodes.Forbidden
    };
    const statusCode = errorMapping[error.message] || getGeneratedErrorStatus(error.message) || errorCode;

    res.status(statusCode).send({
        message: error.message
    });
};

const generateMessage = (template, modelName) => {
    return template.replace('document', modelName);
};

const generateLengthError = (template, size, change) => {
    return template.replace('size', size).replace('operation', change);
};

const statusCodes = {
    BadRequest : 400,
    InvalidOperation : 500,
    Unauthorized : 401,
    Forbidden : 403,
    NotFound : 404,
    Conflict : 409,
    NotSupported : 415,
    TooManyRequests : 429,
    NotImplemented : 501,
    Timeout : 504
}

const errorMessage = {
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try after some time.',
    INVALID_TOKEN: 'Token is invalid or expired.',
    LIMIT_EXCEEDED: 'Request limit exceeded. Please try after some time.',
    INVALID_REQUEST: 'No document found.',
    REGISTER_ERROR: 'No user found with this email address. Please register.',
    NOT_VERIFIED: 'User is not verified. Please verify.',
    INVALID_CREDENTIALS: 'Email or password is invalid.',
    SESSION_EXPIRED: 'Your session has been expired. Please login again.',
    ALREADY_REGISTERED: 'You are already registered.',
    USER_UNAUTHORIZED: 'You are not authorized to perform this operation',
    SEND_MAIL_FAILED: 'Failed to send document',
    DOCUMENT_NOT_UPDATED: 'document not updated',
    NOT_REMOVED: 'The document can\'t be deleted, Please try after some time.',
    DATA_ARCHIVED: 'The document is deleted, you can\'t perform this operation',
    LENGTH_NOT_ALLOWED: 'Length should be between size for operation',
    DIRECTORY_NOT_READ: 'Error reading themes directory',
    PARAMS_REQUIRED : 'document required',
    MULTIPLE_EMAILS_PROVIDED: 'Provide multiple email addresses when only one is needed',
    NO_EMAIL_PROVIDED: 'No email was provided',
    NO_ACCESS: 'User does not have access to this document',
    ACCOUNT_BLOCKED : 'User account has been Blocked'
};

const successMessage = {
    RESET_PASSWORD: 'Password changed successfully',
    RESET_PASSWORD_MAIL_SENT: 'Please check your mail to reset password.',
    MAIL_SCHEDULED: 'document scheduled successfully',
    REGISTER_SUCCESS: 'User registered. Please verify email address.',
    VERIFY_EMAIL: 'Email verified. You can now log in',
    SEND_VERIFICATION_MAIL: "document link sent to email.",
    DELETE_DOCUMENT: "document removed successfully.",
    DOCUMENT_UPDATED: "document updated successfully",
    USER_LOGOUT: 'Successfully logged out.',
    POST_SUCCESS: 'Post has been document successfully'
};

module.exports = {
    respondOk,
    respondError,
    errorMessage,
    successMessage,
    generateMessage,
    generateLengthError,
    statusCodes
};

const getGeneratedErrorStatus = (message) => {
    if (!message) return null;
    if (message.startsWith('User does not have access to this ')) {
        return statusCodes.Forbidden;
    }
    if (message.startsWith('The ') && message.endsWith(' is deleted, you can\'t perform this operation')) {
        return statusCodes.Forbidden;
    }
    if (message.startsWith('No ') && message.endsWith(' found.')) {
        return statusCodes.NotFound;
    }
    return null;
};
