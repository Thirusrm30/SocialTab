require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_for_testing';

// Mock DB for OTPs (In production, use Redis or MongoDB)
const otpStore = new Map();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

// Helper to send email
async function sendEmail(to, subject, html) {
    try {
        const info = await transporter.sendMail({
            from: '"SocialTab Admin" <admin@socialtab.com>',
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}`);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// 1. Generate OTP
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Store in memory with 10 min expiry and retry counts
    otpStore.set(email, {
        hash: hashedOtp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
        retries: 0
    });
    console.log(`OTP generated for ${email}: ${otp}`);

    // Send OTP via Email
    await sendEmail(
        email,
        'Your SocialTab Verification Code',
        `<p>Your 6-digit OTP code is: <strong>${otp}</strong></p><p>It will expire in 5 minutes.</p>`
    );

    res.json({ message: 'OTP sent successfully' });
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!otpStore.has(email)) {
        return res.status(400).json({ error: 'No OTP requested or expired' });
    }

    const storedOtp = otpStore.get(email);
    if (Date.now() > storedOtp.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedOtp.retries >= 3) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'Maximum retry attempts reached. Request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, storedOtp.hash);
    if (!isMatch) {
        storedOtp.retries += 1;
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Clear OTP
    otpStore.delete(email);

    // Issue JWT Token
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'OTP verified', token });
});

// 3. Email Alerts Endpoint
app.post('/api/email/alert', async (req, res) => {
    const { to, type, data } = req.body;

    let subject = '';
    let html = '';

    switch (type) {
        case 'login_alert':
            subject = 'New Login Alert - SocialTab';
            html = `<p>We noticed a new login to your account from a new device.</p><p>Browser: ${data.browser || 'Unknown'}</p><p>If this wasn't you, please reset your password immediately.</p>`;
            break;
        case 'group_created':
            subject = 'New Group Created - SocialTab';
            html = `<p>You have successfully created the group <strong>${data.groupName}</strong>.</p>`;
            break;
        case 'expense_added':
            subject = 'New Expense Added - SocialTab';
            html = `<p>A new expense <strong>${data.description}</strong> of amount $${data.amount} was added to your group.</p>`;
            break;
        case 'payment_success':
            subject = 'Payment Successful - SocialTab';
            html = `<p>Your payment of $${data.amount} was successfully processed.</p><p>Transaction ID: ${data.transactionId}</p>`;
            break;
        default:
            return res.status(400).json({ error: 'Invalid alert type' });
    }

    await sendEmail(to, subject, html);
    res.json({ message: 'Alert email sent' });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
