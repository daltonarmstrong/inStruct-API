require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT; // Render assigns the port
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
        console.log("🔹 Received input:", inputPrompt);

        // 🔹 Step 1: Create a new thread
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
        if (!threadId) {
            throw new Error("Failed to create a thread with OpenAI.");
        }
        console.log("✅ Created thread:", threadId);

        // 🔹 Step 2: Send user message to the Assistant
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
        console.log("✅ Sent message to assistant");

        // 🔹 Step 3: Trigger Assistant processing
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
        console.log("✅ Started processing, runId:", runId);

        // 🔹 Step 4: Poll for completion (with retry limit)
        let runStatus;
        let attempts = 0;
        const maxAttempts = 10;  // Stop after 10 retries (20 seconds total)
        do {
            if (attempts >= maxAttempts) {
                throw new Error("Run processing timed out.");
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 sec before checking
            attempts++;

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
            console.log(`🔄 Attempt ${attempts}: Run status:`, runStatus);
        } while (runStatus !== 'completed');

        // 🔹 Step 5: Retrieve the response from the Assistant
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
        console.log("✅ Messages received:", JSON.stringify(messages, null, 2));

        // 🔹 Step 6: Extract and return the assistant's response
        const lastMessage = messages
            .filter(msg => msg.role === 'assistant') // Ensure we only get the assistant's response
            .map(msg => msg.content?.[0]?.text?.value || "No valid response.")
            .pop();

        console.log("✅ Optimized Prompt:", lastMessage);

        res.json({ optimizedPrompt: lastMessage });

    } catch (error) {
        console.error("❌ OpenAI API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to optimize prompt." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
