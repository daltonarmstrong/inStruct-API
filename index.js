 
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/optimize', (req, res) => {
    const { inputPrompt } = req.body;
    if (!inputPrompt) {
        return res.status(400).json({ error: "No input received." });
    }
    // Dummy response for now
    res.json({ optimizedPrompt: `Optimized: ${inputPrompt}` });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
