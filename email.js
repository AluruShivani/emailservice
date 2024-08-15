const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// Configure primary email service (e.g., Gmail)
const primaryTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.PRIMARY_EMAIL, // Your primary email address(replace with the original email Id)
    pass: process.env.PRIMARY_PASSWORD // Your primary email password or app password(replace with the password)
  }
});

// Configure backup email service (e.g., SendGrid)
const backupTransporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey', // SendGrid uses 'apikey' as the username
    pass: process.env.SENDGRID_API_KEY // Your SendGrid API key
  }
});

// Function to send an email using the specified transporter
async function sendEmail(transporter, options) {
  return transporter.sendMail(options);
}

// Function to send email with retry logic
async function sendWithRetry(options) {
  let attempts = 0;
  let success = false;
  let transporter = primaryTransporter;

  while (attempts < 3 && !success) {
    try {
      await sendEmail(transporter, options);
      console.log('Email sent successfully');
      success = true;
    } catch (error) {
      console.log(`Attempt ${attempts + 1} failed: ${error.message}`);
      attempts++;
      await new Promise(res => setTimeout(res, Math.pow(2, attempts) * 1000)); // Exponential backoff
    }
  }

  if (!success) {
    console.log('Switching to backup service');
    transporter = backupTransporter;
    try {
      await sendEmail(transporter, options);
      console.log('Email sent successfully using backup service');
    } catch (error) {
      console.log('Backup service failed: ' + error.message);
    }
  }
}

// Define an endpoint to trigger email sending
app.get('/send', async (req, res) => {
  const mailOptions = {
    from: 'abcd@gmail.com', // Sender address
    to: '12345@gmail.com', // List of recipients
    subject: 'Test Email', // Subject line
    text: 'Hello World!' // Plain text body
  };

  await sendWithRetry(mailOptions);
  res.send('Email process completed');
});

// Start the Express server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
