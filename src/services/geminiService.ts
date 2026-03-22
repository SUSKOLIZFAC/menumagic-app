import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const digitizeMenuImage = async (base64Image: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
              mimeType: mimeType,
            },
          },
          {
            text: `Extract the menu items, descriptions, and prices from this image. 
            Return ONLY a valid JSON object with the following structure. Do not include markdown formatting like \`\`\`json.
            {
              "categories": [
                {
                  "name": "Category Name (e.g. Starters, Mains, Drinks)",
                  "items": [
                    {
                      "name": "Item Name",
                      "description": "Item Description (if any, otherwise empty string)",
                      "price": 10.50
                    }
                  ]
                }
              ]
            }
            For the price, return a number, not a string, and remove currency symbols.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No text returned from Gemini");
  } catch (error) {
    console.error("Error digitizing menu:", error);
    throw error;
  }
};
