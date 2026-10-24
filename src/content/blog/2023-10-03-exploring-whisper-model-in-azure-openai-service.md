---
title: "Exploring the Whisper model in Azure OpenAI Service"
description: "Whisper model in Azure OpenAI Service Recently Microsoft announced that Azure OpenAI Service and Azure AI Speech now offer the OpenAI Whisper model in preview (link) \"Whisper\" is a"
pubDate: "2023-10-03"
legacy: {"id":1897,"path":"/2023/10/03/exploring-whisper-model-in-azure-openai-service/","taxonomySlugs":{"categories":["ai","azure","c","openai-services","python"],"tags":[]}}
categories: ["C#","ai","azure","openai-services","python"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/whisper-playground"]
heroImage: "/wp-content/uploads/2023/10/OIG2.jpg"
---

# Whisper model in Azure OpenAI Service

Recently Microsoft announced that Azure OpenAI Service and Azure AI Speech now offer the OpenAI Whisper model in preview ([link](https://azure.microsoft.com/en-us/updates/openai-whisper-model-in-preview-in-azure-openai-service-and-azure-ai-speech/))

"Whisper" is an automatic speech recognition (**ASR**) system developed by OpenAI. It's trained on a large amount of data from the web and is designed to convert spoken language into written text.

As I'm currently exploring the exciting world of AI, I was eager to try this out and I'm thrilled to share it with you!

# Deploying a Whisper model

So I went to Azure OpenAI Studio and deployed a whisper model:

[![Whisper model deployment](/wp-content/uploads/2023/10/whisper.jpg)](/wp-content/uploads/2023/10/whisper.jpg)

Note that at the moment of writing, the Whisper model is only available in Azure OpenAI Service in North Central US and West Europe.

If you haven't got an Azure OpenAI Service running, here's how you can can create and deploy it: [How-to: Create and deploy an Azure OpenAI Service resource - Azure OpenAI | Microsoft Learn](https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource?pivots=web-portal)

From this Azure OpenAI Service in the Azure Portal, you can now open-up Azure OpenAI Studio and deploy the models you would like.

Once the model is deployed, head over to the Azure OpenAI Service in the Azure portal and select "**Keys and Endpoint**" from the menu. Copy "**Key 1**" and the "**Whisper APIs**" endpoint, we'll need these in our code later on.

[![openAI Service Keys and Endpoint](/wp-content/uploads/2023/10/openaiservice.jpg)](/wp-content/uploads/2023/10/openaiservice.jpg)

# Talking to the Whisper API with Python

As the cool kids these days use Python, especially in the world of AI, I decided to give it a go as well:

```python
import requests

AZURE_OPENAI_ENDPOINT = '<<REDACTED>>'
AZURE_OPENAI_KEY = '<<REDACTED>>'
MODEL_NAME = 'whisper'
HEADERS = { "api-key" : AZURE_OPENAI_KEY }

FILE_LIST = {
    "a": "what-is-it-like-to-be-a-crocodile-27706.mp3",
    "b": "toutes-les-femmes-de-ma-vie-164527.mp3",
    "c": "what-can-i-do-for-you-npc-british-male-99751.mp3"
    }

print('Choose a file:')

for i in FILE_LIST:
    print(f'{i} -> {FILE_LIST[i]}')

file = FILE_LIST.get(input())

if file:
    with open(f'../assets/{file}', 'rb') as audio:
        r = requests.post(f'{AZURE_OPENAI_ENDPOINT}/openai/deployments/{MODEL_NAME}/audio/transcriptions?api-version=2023-09-01-preview', 
                        headers=HEADERS, 
                        files={'file': audio})
        print(r.json().get('text'))
else:
    print('invalid file')
```

Please make sure to update this code with your own values for the **AZURE\_OPENAI\_ENDPOINT, AZURE\_OPENAI\_KEY** and **MODEL\_NAME** variables. The Endpoint should be the "**Whisper APIs**" value you copied from the "**Keys and Endpoint**" tab and the key should be the "**Key 1**" value that you have copied. **MODEL\_NAME** is the name that you have given to your deployed Whisper model. I've named mine just 'whisper'.

This program basically lets the user pick one of three files. The selected file will be POSTed to a specific endpoint which is constructed using your own AZURE\_OPENAI\_ENDPOINT value and the name of your model. Via the header we're sending our api-key. The resulting json looks something like this:

```json
{'text': 'What can I do for you?'}
```

The "text" property contains the text the Whisper model has transcribed from the given audio file.

_Note: make sure to use "**pip**" to install the "**requests**" package in order to run the above code!_

# Talking to the Whisper API with C#

For those unfamiliar with Python, or just curious at how this can be done in C#, let's take a look:

```csharp
class Program
{
    private static readonly string AzureOpenAIEndpoint = "<<REDACTED>>";
    private static readonly string AzureOpenAIKey = "<<REDACTED>>";
    private static readonly string ModelName = "whisper";

    private static readonly Dictionary<string, string> FileList = new Dictionary<string, string>
    {
        {"a", "what-is-it-like-to-be-a-crocodile-27706.mp3"},
        {"b", "toutes-les-femmes-de-ma-vie-164527.mp3"},
        {"c", "what-can-i-do-for-you-npc-british-male-99751.mp3"}
    };

    static async Task Main(string[] args)
    {
        Console.WriteLine("Choose a file:");
        foreach (var fileEntry in FileList)
        {
            Console.WriteLine($"{fileEntry.Key} -> {fileEntry.Value}");
        }

        var chosenFileKey = Console.ReadLine();
        if (FileList.TryGetValue(chosenFileKey ?? "", out var fileName))
        {
            try
            {
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("api-key", AzureOpenAIKey);

                    using (var audioFileStream = new FileStream($"../../../../../assets/{fileName}", FileMode.Open))
                    {
                        var formData = new MultipartFormDataContent
                        {
                            { new StreamContent(audioFileStream), "file", fileName }
                        };

                        var response = await httpClient.PostAsync($"{AzureOpenAIEndpoint}/openai/deployments/{ModelName}/audio/transcriptions?api-version=2023-09-01-preview", formData);
                        var responseContent = await response.Content.ReadAsStringAsync();

                        if (response.IsSuccessStatusCode)
                        {
                            var options = new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            };
                            var jsonResponse = JsonSerializer.Deserialize<Response>(responseContent, options);
                            Console.WriteLine(jsonResponse.Text.ToString());
                        }
                        else
                        {
                            Console.WriteLine("Failed to transcribe audio.");
                            Console.WriteLine($"Response: {responseContent}");
                        }
                    }
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"An error occurred: {e.Message}");
            }
        }
        else
        {
            Console.WriteLine("Invalid file");
        }
    }
}

[DataContract]
class Response
{
    [DataMember]
    public string Text { get; set; }
}
```

It's (almost) exactly the same but different! :-) We're taking a file, we post it to a specific endpoint and print the text property of the returned json-object.

# Summary

Pretty cool stuff, don't you think? With only a few clicks and a few lines of code (especially in Python!😯) we're able to get a high fidelity transcription of a particular audio file!

This small proof of concept sets the stage for something I want to try out in the coming days. I'll post my findings on my blog!

Both the Python and C# code as well as the assets of this demo can be found on [GitHub](https://github.com/PieEatingNinjas/whisper-playground).

## About the audio files

The royalty-free audio files that I use in this demo come from this website: [Free Speech Sound Effects Download - Pixabay](https://pixabay.com/sound-effects/search/speech/)
