const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for Railway
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is running' });
});

module.exports = router;
