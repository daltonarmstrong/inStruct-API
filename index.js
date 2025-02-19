require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT; // Use only Render's assigned port
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
        // Step 1: Create a new thread
        const threadResponse = await axios.post(
            'https://api.openai.com/v1/threads',
            {},
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        const threadId = threadResponse.data.id;

        // Step 2: Send user message to the Assistant
        await axios.post(
            `https://api.openai.com/v1/threads/${threadId}/messages`,
            { role: 'user', content: inputPrompt },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Step 3: Trigger Assistant processing
        const runResponse = await axios.post(
            `https://api.openai.com/v1/threads/${threadId}/runs`,
            { assistant_id: ASSISTANT_ID },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        const runId = runResponse.data.id;

        // Step 4: Poll for completion
        let runStatus;
        do {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking status
            const statusResponse = await axios.get(
                `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2',
                        'Content-Type': 'application/json'
                    }
                }
            );
            runStatus = statusResponse.data.status;
        } while (runStatus !== 'completed');

        // Step 5: Retrieve the response from the Assistant
        const messagesResponse = await axios.get(
            `https://api.openai.com/v1/threads/${threadId}/messages`,
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2',
                    'Content-Type': 'application/json'
                }
            }
        );

        const messages = messagesResponse.data.data;
        const lastMessage = messages[messages.length - 1]?.content?.[0]?.text?.value || "No response received.";

        res.json({ optimizedPrompt: lastMessage });

    } catch (error) {
        console.error("Error from OpenAI API:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to optimize prompt." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
