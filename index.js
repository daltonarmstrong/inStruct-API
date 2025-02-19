require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000; // Use Render’s assigned port
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.use(cors());
app.use(express.json());

app.post('/optimize', async (req, res) => {
    const { inputPrompt } = req.body;
    if (!inputPrompt) {
        return res.status(400).json({ error: "No input received." });
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/threads',
            { messages: [{ role: 'user', content: inputPrompt }] },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ optimizedPrompt: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Error from OpenAI API:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to optimize prompt." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
