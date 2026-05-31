const { UI_BASE_URL, SERVICE_BASE_URL} = require("../../environment-config");
const email = process.env.EMAIL_CONTACT_US;

// Function-based wrappers used by mail-service and mail-controller
const emailTemplates = {
  verifyEmail: ({ name, verifyUrl }) =>
    `<p>Hi ${name},</p><p>Click below to verify your Momenta account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,

  resetPassword: ({ name, resetUrl }) =>
    `<p>Hi ${name},</p><p>Click below to reset your Momenta password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 24 hours.</p>`,

  scheduledDelivery: ({ creatorName, wallName, token, serviceBaseUrl }) =>
    exports.scheduledDeliveryTemplate
      .replace("$creatorName", creatorName)
      .replace("$wallName", wallName)
      .replace("$token", token),

  accessControl: ({ wallId, creatorName, wallName, serviceBaseUrl }) =>
    exports.accessControlEmail
      .replace("$wallId", wallId)
      .replace("$creatorName", creatorName)
      .replace("$wallName", wallName),
};
exports.emailTemplates = emailTemplates;

exports.scheduledDeliveryTemplate = `
<html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@100..900&display=swap" rel="stylesheet">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            @media(max-width:600px){
                .main-table{
                    width:100% !important;
                }
            }
        </style>
    </head>
    <body style="font-family:League Spartan, sans-serif; padding: 0px; margin: 0px; background: #f2f5fb;">

        <table style="background: #f2f5fb; width: 100%; border-collapse: collapse;">
            <tr>
                <td style=" padding:20px;">
                    <table class="main-table" style="font-family:League Spartan, sans-serif; width: 600px; margin: 0 auto; border-collapse: collapse; background: #fff; box-shadow: 2px 2px 15px #DFE8F1;">

                        <tr>
                            <td style=" padding:8px; text-align: center"> <img src="https://drive.google.com/uc?export=view&id=1y386LEvT_KBZne7d1_Q2qilGXquGZvH8" style="width: 175px;"></td> 
                        </tr>
                        <tr>
                            <td style="padding: 0px;"><img src="https://drive.google.com/uc?export=view&id=1Cv9NL6Ml5BDfDf9b-p64a_QrzB68oWdP" style="display: block; width: 100%;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px; text-align: center;">
                                <h2 style="color: #405670; text-align: center; line-height: 24px; font-size: 20px; margin-top: 30px;"> 
                                    Schedule Delivery
                                </h2>
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-top: 15px;">
                                    You’ve been sent a special moment<b> $wallName </b>, created by <b>$creatorName</b>. 

                                The moment contains heartfelt messages, stories, and memories from those who care about you.
                                To view the moment, click the Button below:

                                </p>

                                <a href="${SERVICE_BASE_URL}/api/walls/view-receiver-wall/$token" style="display: inline-block; width: 200px; height: 44px; line-height: 47px; white-space: nowrap; text-align: center; font-size: 15px; font-weight: 500;
                                   color: #fff; text-decoration: none; border-radius: 4px; background: rgb(92,204,179); margin-top: 10px;
                                   background: linear-gradient(183deg, rgba(92,204,179,1) 0%, rgba(42,175,145,1) 100%);"> MOMENTA
                                </a>
                                
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 10px 42px;"> 
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-top: 15px;">
                                    Take your time exploring the messages and thoughts that have been shared with you. We hope this brings a smile to your face and adds joy to your day. If you have any questions or would like assistance, feel free to reach out.

                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 42px; color: #405670; font-weight: normal; font-size: 16px; line-height: 24px;"> 
                                <p style="margin-bottom: 0px; font-weight: 300;">Thanks,</p> 
                                Momenta Team
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #B3CBE0; font-size: 12px; text-align: center; padding: 0px 42px; padding-top:40px; padding-bottom: 5px;">
                                <div style="border-top: 1px solid #F0F8FC; padding: 14px 0px;">
                                    <b> Disclaimer:</b> This email  and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.

                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
`;

exports.emailVerificationTemplate = `
<html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@100..900&display=swap" rel="stylesheet">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            @media(max-width:600px){
                .main-table{
                    width:100% !important;
                }
            }
        </style>
    </head>
    <body style="font-family:League Spartan, sans-serif; padding: 0px; margin: 0px; background: #f2f5fb;">
        <table style="background: #f2f5fb; width: 100%; border-collapse: collapse;">
            <tr>
                <td style=" padding:20px;">
                    <table class="main-table" style="font-family:League Spartan, sans-serif; width: 600px; margin: 0 auto; border-collapse: collapse; background: #fff; box-shadow: 2px 2px 15px #DFE8F1;">

                        <tr>
                            <td style=" padding:8px; text-align: center"> <img src="https://drive.google.com/uc?export=view&id=1y386LEvT_KBZne7d1_Q2qilGXquGZvH8" style="width: 175px;"></td> 
                        </tr>
                        <tr>
                            <td style="padding: 0px;"><img src="https://drive.google.com/uc?export=view&id=1wSNp7MYNHM_qY_VldeyGLJAIcYJ70RiV" style="display: block; width: 100%;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px; text-align: center;">
                                <h2 style="color: #405670; text-align: center; line-height: 24px; margin-bottom: 0px; font-size: 20px;"><span style="font-weight: 300; font-size: 16px; display: block">You’re one step away</span> 
                                    Verify your email address 
                                </h2>
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-top: 15px;">
                                    Thank you for registering with Momenta. We're excited to have you with us!
                                    To complete your registration, please verify your email address by clicking the button below:
                                </p>
                                <a href="verificationLink" style="display: inline-block; width: 200px; height: 44px; line-height: 47px; white-space: nowrap; text-align: center; font-size: 15px; font-weight: 600; color: #fff; text-decoration: none; border-radius: 4px;
                                   background: rgb(92,204,179); margin-top: 10px; margin-bottom: 15px;
                                   background: linear-gradient(183deg, rgba(92,204,179,1) 0%, rgba(42,175,145,1) 100%);">VERIFY EMAIL!
                                </a>
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-top: 15px;">
                                    Once verified, you'll be able to start exploring and creating your own moments for any occasion. 
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px;">
                                <div style="background:#FBFBFB; margin-top: 18px; width: 226px; padding: 6px 0px; border-radius: 6px; line-height: 16px; margin: 0 auto; text-align: center; margin-top: 26px;">
                                    <img src="https://drive.google.com/uc?export=view&id=1ymyLNvyrdVzkt8dRLEUweY2VQ8-ayvwE">
                                    <p style="font-size: 14px; font-weight: 600; color: #405670; display: inline-block; text-align: left; padding-left: 2px;">Have a Question?
                                        <a href="mailto:${email}" style="font-size: 12px; color: #2196f3; display: block; font-weight: normal; text-align: left;">Reach out to our team</a>
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #B3CBE0; font-size: 12px; text-align: center; padding: 0px 50px; padding-top:40px; padding-bottom: 5px;">
                                <div style="border-top: 1px solid #F0F8FC; padding: 14px 0px;">
                                    <b>Disclaimer:</b> This email  and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
`;

exports.resetPasswordEmail = `
<!DOCTYPE html>
<html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@100..900&display=swap" rel="stylesheet">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            @media(max-width:600px){
                .main-table{
                    width:100% !important;
                }
            }
        </style>
    </head>
    <body style="font-family:League Spartan, sans-serif; padding: 0px; margin: 0px; background: #f2f5fb;">

        <table style="background: #f2f5fb; width: 100%; border-collapse: collapse;">
            <tr>
                <td style=" padding:20px;">
                    <table class="main-table" style="font-family:League Spartan, sans-serif; width: 600px; margin: 0 auto; border-collapse: collapse; background: #fff; box-shadow: 2px 2px 15px #DFE8F1;">

                        <tr>
                            <td style=" padding:8px; text-align: center"> <img src="https://drive.google.com/uc?export=view&id=1y386LEvT_KBZne7d1_Q2qilGXquGZvH8" style="width: 175px;"></td> 
                        </tr>
                        <tr>
                            <td style="padding: 0px;"><img src="https://drive.google.com/uc?export=view&id=1ipejDEpDITdcrvrBMqPoeW0xz7rD5yvc" style="display: block; width: 100%;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px; text-align: center;">
                                <h2 style="color: #405670; text-align: center; line-height: 24px; font-size: 20px; margin-top: 30px;"> 
                                    Forgot your password?
                                </h2>
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-bottom: 30px;">
                                    Don’t worry we’ve got your back. You can use the following button to <a href="verificationLink" style="text-decoration: none; font-weight: 600; color: #405670;"> <b>reset your password!</b></a>
                                </p>

                                <a href="verificationLink" style="display: inline-block; width: 205px; height: 44px; line-height: 48px; white-space: nowrap; text-align: center; font-size: 15px; font-weight: 500;
                                   color: #fff; text-decoration: none; border-radius: 4px; background: rgb(92,204,179);
                                   background: linear-gradient(183deg, rgba(92,204,179,1) 0%, rgba(42,175,145,1) 100%);">RESET YOUR PASSWORD
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 5px 42px;"> 
                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px;">
                                    This link will remain active for the next 3 hours. If you need a new password reset link, please click <a href="${UI_BASE_URL}/reset-password" style="color:#2196f3;">here</a>.
                                </p> 
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 20px 42px; color: #405670; font-weight: normal; font-size: 16px; line-height: 24px;"> 
                                <p style="margin-bottom: 0px; font-weight: 300;">Thanks,</p> 
                                Momenta Team
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 20px 42px; color: #405670; font-weight:300; font-size: 14px; line-height: 20px;"> 
                                You’re receiving this email because a password reset was requested for your account.
                                If you have not initiated the request, then please report it back to <a style="color:#2196f3;">${email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #B3CBE0; font-size: 12px; text-align: center; padding: 0px 42px; padding-top:40px; padding-bottom: 5px;">
                                <div style="border-top: 1px solid #F0F8FC; padding: 14px 0px;">
                                    <b> Disclaimer:</b> This email  and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.

                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
`;

exports.accessControlEmail = `
<html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@100..900&display=swap" rel="stylesheet">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            @media(max-width:600px){
                .main-table{
                    width:100% !important;
                }
            }
        </style>
    </head>
    <body style="font-family:League Spartan, sans-serif; padding: 0px; margin: 0px; background: #f2f5fb;">

        <table style="background: #f2f5fb; width: 100%; border-collapse: collapse;">
            <tr>
                <td style=" padding:20px;">
                    <table class="main-table" style="font-family:League Spartan, sans-serif; width: 600px; margin: 0 auto; border-collapse: collapse; background: #fff; box-shadow: 2px 2px 15px #DFE8F1;">
                        <tr>
                            <td style=" padding:8px; text-align: center"> <img src="https://drive.google.com/uc?export=view&id=1y386LEvT_KBZne7d1_Q2qilGXquGZvH8" style="width: 175px;"></td> 
                        </tr>

                        <tr>
                            <td style="padding: 0px;"><img src="https://drive.google.com/uc?export=view&id=1v7ShgglnP3OGmqwh4wQGpmBjt2XRDQfc" style="display: block; width: 100%;"></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px;">
                                <h2 style="color: #405670; text-align: center; line-height: 30px; margin-bottom: 0px; font-size: 20px;">
                                <span style="font-weight: 300; display: block">You have been granted access to the moment</span> 
                                    $wallName <span style="font-weight: 300;">. This moment was created by $creatorName <br> and now you can start exploring.</span>
                                </h2>
                                

                                <p style="color: #405670; font-weight: 300; font-size: 16px; line-height: 24px; text-align: center; margin-top: 15px;">
                                    To access the moment, please click the button below:
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 50px; text-align: center">
                                <a href="${UI_BASE_URL}/moment/$wallId" style="display: inline-block; width: 200px; height: 44px; line-height: 47px; white-space: nowrap; text-align: center; font-size: 15px; font-weight: 600; color: #fff; text-decoration: none; border-radius: 4px;
                                   background: rgb(92,204,179);
                                   background: linear-gradient(183deg, rgba(92,204,179,1) 0%, rgba(42,175,145,1) 100%);">JOIN NOW!
                                </a>

                                <table style="width: 200px ; margin: 0 auto; padding: 20px 0px;">
                                    <tr>
                                        <td style="vertical-align: middle; line-height: 0px;"> <span style="border-top: 1px solid #F0F8FC; width:90px; display: inline-block; margin-right: 2px;"></span></td>
                                        <td style="color:#C4CFE0; font-size:15px; font-weight:600;">OR</td>
                                        <td style="vertical-align: middle; line-height: 0px;"> <span style="border-top: 1px solid #F0F8FC; width:90px; display: inline-block; margin-left: 2px;"></span></td>
                                    </tr>
                                </table>
                                <a href="${UI_BASE_URL}/moment/$wallId" style="display: inline-block; height: 44px; line-height: 47px; white-space: nowrap; width: 200px; text-align: center; font-size: 15px; font-weight: 600;
                                   color: #4A5D5F; text-decoration: none; border-radius: 4px; background:#F1F3FF;"><img style="padding-right: 4px" src="img/gmail.png"> JOIN WITH GOOGLE</a>
                                <p style="font-size: 16px; font-weight: 300; color: #5D839F; line-height: 24px; margin-top: 20px;">
                                    This moment represents a meaningful exchange. We encourage you to take the time to explore and engage with the content shared by others, and if you have any questions or need support, feel free to reach out to [Moment Owner’s Name].

                                    Thank you for being a part of this community. We’re looking forward to your involvement in this meaningful journey.

                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="color: #B3CBE0; font-size: 12px; text-align: center; padding: 0px 50px; padding-top:40px; padding-bottom: 5px;">
                                <div style="border-top: 1px solid #F0F8FC; padding: 16px 0px;">
                                    <a href="#" style="color: #2196f3;">Unsubscribe</a> from any communication about this invitarion
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
`
