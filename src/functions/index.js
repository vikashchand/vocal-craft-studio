// Firebase Cloud Functions for email notifications
// This file should be deployed to Firebase Functions

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Configure your email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().email.user, // Set via: firebase functions:config:set email.user="your-email@gmail.com"
    pass: functions.config().email.pass  // Set via: firebase functions:config:set email.pass="your-app-password"
  }
});

// Cloud Function to send email notification when a user signs up
exports.sendEmailNotification = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated (optional security measure)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    // Email options
    const mailOptions = {
      from: functions.config().email.user,
      to: functions.config().email.admin, // Set via: firebase functions:config:set email.admin="admin@yourdomain.com"
      subject: 'New User Signed Up - VocalGenX',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10667C;">New User Registration</h2>
          <p>A new user has signed up for VocalGenX!</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>User Email:</strong> ${email}<br>
            <strong>Registration Time:</strong> ${new Date().toLocaleString()}<br>
            <strong>Platform:</strong> VocalGenX Web App
          </div>
          <p style="color: #666;">This is an automated notification from your VocalGenX application.</p>
        </div>
      `,
      text: `New user signed up: ${email} at ${new Date().toLocaleString()}`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    functions.logger.info('Email notification sent successfully', { email });
    
    return { 
      success: true, 
      message: 'Email notification sent successfully' 
    };

  } catch (error) {
    functions.logger.error('Error sending email notification', error);
    
    // Don't throw error to avoid blocking user registration
    // Just log the error and return success
    return { 
      success: false, 
      message: 'Email notification failed but user registration successful',
      error: error.message 
    };
  }
});

// Optional: Cloud Function triggered automatically when a user is created
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    const mailOptions = {
      from: functions.config().email.user,
      to: functions.config().email.admin,
      subject: 'New User Account Created - VocalGenX',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10667C;">New User Account Created</h2>
          <p>A new user account has been automatically created in VocalGenX!</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>User ID:</strong> ${user.uid}<br>
            <strong>Email:</strong> ${user.email}<br>
            <strong>Display Name:</strong> ${user.displayName || 'Not provided'}<br>
            <strong>Provider:</strong> ${user.providerData[0]?.providerId || 'Unknown'}<br>
            <strong>Creation Time:</strong> ${user.metadata.creationTime}
          </div>
          <p style="color: #666;">This is an automated notification triggered by Firebase Authentication.</p>
        </div>
      `,
      text: `New user account created: ${user.email} (${user.uid}) at ${user.metadata.creationTime}`
    };

    await transporter.sendMail(mailOptions);
    functions.logger.info('User creation email sent successfully', { uid: user.uid, email: user.email });

  } catch (error) {
    functions.logger.error('Error sending user creation email', error);
  }
});

// Optional: Welcome email to new users
exports.sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { email, displayName } = data;

    const mailOptions = {
      from: functions.config().email.user,
      to: email,
      subject: 'Welcome to VocalGenX!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10667C;">Welcome to VocalGenX!</h1>
          <p>Hi ${displayName || 'there'},</p>
          <p>Thank you for signing up for VocalGenX! We're excited to have you on board.</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>What you can do with VocalGenX:</h3>
            <ul>
              <li>Convert text to lifelike speech</li>
              <li>Use AI-powered voice generation</li>
              <li>Convert speech to text</li>
              <li>Experience premium audio quality</li>
            </ul>
          </div>
          <p>Get started by exploring our features and creating your first audio generation!</p>
          <p>Best regards,<br>The VocalGenX Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    return { success: true, message: 'Welcome email sent successfully' };

  } catch (error) {
    functions.logger.error('Error sending welcome email', error);
    throw new functions.https.HttpsError('internal', 'Failed to send welcome email');
  }
});
