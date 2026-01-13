const express = require('express');
const zoomController = require('../controllers/zoomController');

const router = express.Router();

/**
 * RTMS Control endpoint - Start/Stop RTMS for an engagement
 * No authentication middleware - uses bearer token from env
 */
router.post('/rtms/control', zoomController.handleRtmsControl);

module.exports = router;
