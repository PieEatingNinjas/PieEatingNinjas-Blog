---
title: "Translate spoken text using Whisper and GPT with Azure OpenAI Services and .NET MAUI"
description: "In a previous blogpost, I showed you how to leverage the Whisper model on Azure OpenAI Services to transcribe an audio file to text. We can easily take this a step further: instead"
pubDate: "2023-12-08"
legacy: {"id":1949,"path":"/2023/12/08/translate-spoken-text-with-whisper-and-gpt-with-azure-open-ai-services-and-net-maui/","taxonomySlugs":{"categories":["ai","azure","c","maui","openai-services"],"tags":[]}}
categories: ["C#","ai","azure","maui","openai-services"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/Whisper-translate"]
heroImage: "/wp-content/uploads/2023/12/whisperGTP.webp"
---

In a [previous blogpost](/2023/10/03/exploring-whisper-model-in-azure-openai-service/ "Exploring the Whisper model in Azure OpenAI Service"), I showed you how to leverage the Whisper model on Azure OpenAI Services to transcribe an audio file to text.

We can easily take this a step further: instead of just returning the speech as text, why not return it translated into another language? Interestingly, the Whisper model and the Azure Open AI APIs, do support the translation to English of a given input. Translating the given input to any other language is not supported by the model. But for this we can simply use a GPT model: after transcribing the audio file by using Whisper, we can use the generated output as the input of a GPT prompt and ask it to translate the text into another language.

## Using Whisper to translate speech to English

As said, translating a non-English audio file to written English is supported by the model (and the API) out-of-the-box. We can use the _GetAudioTranslationAsync_ method on the _Azure.AI.OpenAI.OpenAIClient_ class (_Azure.AI.OpenAI_ NuGet package) to get the English translation of any given audio file:

```csharp
private async Task<string> TranslateToEnglish(BinaryData data)
{
    var _client = new OpenAIClient(new Uri("[Your Azure OAI endpoint]"),
        new AzureKeyCredential("[Your key]"));

    var response = await _client.GetAudioTranslationAsync(
        new AudioTranslationOptions("whisper", data));

    return response.Value.Text;
}
```

We create an instance of an _OpenAIClient_, passing-in our Azure OpenAI endpoint and a key. We can then call the _GetAudioTranslationAsync_ method, passing-in the binary data of the audio file we want to translate. The _"whisper"_ parameter refers to the name we've given to the Whisper model we've deployed on Azure. For more info about deploying an Azure OpenAI Service and deploying a Whisper model through the Azure OpenAI Studio, have a look at my [previous blogpost](/2023/10/03/exploring-whisper-model-in-azure-openai-service/ "Exploring the Whisper model in Azure OpenAI Service") .

In _response.Value.Text_ we can find the English translation of the given audio file in plain text. Additionally, other response formats are available as well (Srt, Vtt, ..). These can be requested by setting the _ResponseFormat_ property on the _AudioTranslationOptions_ that we pass-in to the _GetAudioTranslationAsync_ method. For now, the default (Simple) is what we need.

## Using Whisper and GPT to translate speech to other languages

If we want to translate an audio file to a language other then English, we can do this in 2 steps: Transcribe the audio file using Whisper and then asking GPT to translate this transcription.

Let's take a look at the first step, transcribing an audio file:

```csharp
private async Task<string> Transcribe(BinaryData data)
{
    var response = await _client.GetAudioTranscriptionAsync(
        new AudioTranscriptionOptions("whisper", data));

    return response.Value.Text;
}
```

This looks a lot like the previous method, but instead of calling _GetAudioTranslationAsync_, we call _GetAudioTranscriptionAsync_ which will transcribe the given audio data into the input language.

Now, we can take this text, and ask a GPT model (GPT 3.5 Turbo for example) to translate this. Let's start by deploying a GPT 3.5 Turbo model in Azure OpenAI Studio. Under **Management - Deployments** we can select **Create new deployment** and pass in the following values:

[![](/wp-content/uploads/2023/12/deployGTP35.png)](/wp-content/uploads/2023/12/deployGTP35.png)

Once this model is in place, we can use it through the Azure.OpenAI SDK. Here's how we can can do this:

```csharp
private async Task<string> Translate(string content, string to)
{
    var chatResult = await _client.GetChatCompletionsAsync(
        new ChatCompletionsOptions
        {
            DeploymentName = "gpt-35-turbo",
            Temperature = 0,
            Messages =
            {
                new(ChatRole.System, $"You are a translator, translate the text entered by the user to {to}."),
                new ChatMessage(ChatRole.User, content),
            }
        });

    var answer = chatResult.Value.Choices[0].Message.Content;
    return answer;
}
```

Through the _GetChatCompletionAsync_ method, we can send stuff to our GPT model. The _DeploymentName_ property refers to the name we've defined when deploying this GPT 3.5 Turbo model. The _Temperature_ is set to 0, which controls the creativity of the model. 0 means we want the result to be more deterministic and focussed. The _Messages_ property is the collection of messages we're sending of to the LLM. The first one is the System prompt. With such a prompt we can give the model instructions. In this case we're saying the LLM should act as a translator and translate the given text to a certain language. The second message is the content we want to translate.

When the request finishes, the result (the translated content) can be found in _chatResult.Value.Choices\[0\].Message.Content_ which we then return.

Here's what this entire class (_TranslationService_) looks like:

```csharp
using Azure;
using Azure.AI.OpenAI;

namespace WhisperTranslate.API;

public class TranslationService
{
    readonly OpenAIClient _client;

    public TranslationService()
    {
        _client = new OpenAIClient(new Uri("[Your Azure OAI endpoint]"), new AzureKeyCredential("[Your key]"));
    }

    public async Task<string> Translate(BinaryData audio, string to)
    {
        string translation;

        if (to.Equals("english", StringComparison.InvariantCultureIgnoreCase))
        {
            translation = await TranslateToEnglish(audio);
        }
        else
        {
            var transcription = await Transcribe(audio);
            translation = await Translate(transcription, to);
        }

        return translation;
    }


    private async Task<string> Transcribe(BinaryData data)
    {
        var response = await _client.GetAudioTranscriptionAsync(
            new AudioTranscriptionOptions("whisper", data));

        return response.Value.Text;
    }

    private async Task<string> TranslateToEnglish(BinaryData data)
    {
        var response = await _client.GetAudioTranslationAsync(
            new AudioTranslationOptions("whisper", data));

        return response.Value.Text;
    }

    private async Task<string> Translate(string content, string to)
    {
        var chatResult = await _client.GetChatCompletionsAsync(
            new ChatCompletionsOptions
            {
                DeploymentName = "gpt-35-turbo",
                Temperature = 0,
                Messages =
                {
                    new(ChatRole.System, $"You are a translator, translate the text entered by the user to {to}."),
                    new ChatMessage(ChatRole.User, content),
                }
            });

        var answer = chatResult.Value.Choices[0].Message.Content;
        return answer;
    }
}
```

And we can simply put this behind an API like this:

```csharp
app.MapPost("/translate", async (IFormFile file, string to) =>
{
    var stream = new MemoryStream((int)file.Length);
    file.CopyTo(stream);

    return await new TranslationService().Translate(BinaryData.FromBytes(stream.ToArray()), to);
})
.WithName("TranslateAudio")
.WithOpenApi();
```

With this in place, we have an API endpoint where we can post an audio file to and with the "to" parameter we can specify to which language we want to audio file to translated to.

## Creating the mobile app

Now that we've got this API, we want to start sending audio files to it and get the translated text back. Recording audio in MAUI isn't difficult, thanks to the _Plugin.Maui.Audio_ NuGet package. More info about this package and how to use it to record audio can be found on [GitHub](https://github.com/jfversluis/Plugin.Maui.Audio/blob/main/docs/audio-recorder.md).

Let's define our UI:

```xml
<VerticalStackLayout VerticalOptions="Center">
    <Picker x:Name="Picker" HorizontalOptions="Center">
        <Picker.ItemsSource>
            <x:Array Type="{x:Type x:String}">
                <x:String>English</x:String>
                <x:String>Dutch</x:String>
                <x:String>French</x:String>
                <x:String>Spanish</x:String>
            </x:Array>
        </Picker.ItemsSource>
    </Picker>

    <Button
        x:Name="btnStartRec"
        Clicked="Start_Clicked"
        HorizontalOptions="Center"
        Text="Start" />

    <Button
        x:Name="btnStopRec"
        Clicked="Stop_Clicked"
        HorizontalOptions="Center"
        IsVisible="false"
        Text="Stop" />

    <Label x:Name="lblStatus" HorizontalOptions="Center" />

    <Button
        x:Name="btnTranslate"
        Clicked="Translate_Clicked"
        HorizontalOptions="Center"
        IsVisible="False"
        Text="Translate"
        VerticalOptions="Center" />

    <Label x:Name="lblResult" HorizontalOptions="Center" />

</VerticalStackLayout>
```

There's not much to it: a picker which the user can use to pick the language to translate to, a few buttons and labels.

After installing the _Plugin.Maui.Audio_ NuGet Package, we can start writing code.

When the _Start_ button is clicked, we want to do update our UI controls and call the _StartRecording_ method which check for the required permissions, create an audio recorder and call the audioRecorder's _StartAsync_ method:

```csharp
private async void Start_Clicked(object sender, EventArgs e)
{
    audioBytes = null;
    btnStopRec.IsVisible = true;
    btnStartRec.IsVisible = false;
    lblStatus.Text = "Recording...";

    try
    {
        await StartRecording();
    }
    catch (PermissionException pe)
    {
        lblStatus.Text = pe.Message;
    }
}

private async Task StartRecording()
{
    if (await CheckPermissionIsGrantedAsync<Microphone>())
    {
        audioRecorder = audioManager.CreateRecorder();

        await audioRecorder.StartAsync();
    }
    else
    {
        throw new PermissionException("No permission granted to access Microphone");
    }
}

public static async Task CheckPermissionIsGrantedAsync() where TPermission : BasePermission, new()
{
    PermissionStatus status = await Permissions.CheckStatusAsync();

    if (status == PermissionStatus.Granted)
    {
        return true;
    }

    if (status == PermissionStatus.Denied && DeviceInfo.Platform == DevicePlatform.iOS)
    {
        // Prompt the user to turn on in settings
        // On iOS once a permission has been denied it may not be requested again from the application
        return false;
    }

    if (Permissions.ShouldShowRationale())
    {
        // Prompt the user with additional information as to why the permission is needed
    }

    status = await Permissions.RequestAsync();

    return status == PermissionStatus.Granted;
}


```

When clicking the _Stop_ button, we want to get the stop recording the audio and convert the recording into a byte array, after which we update some UI controls:

```csharp
private async void Stop_Clicked(object sender, EventArgs e)
{
    await StopRecording();

    lblStatus.Text = "Recorded";

    btnTranslate.IsEnabled = true;

    btnTranslate.IsVisible = true;
    btnStartRec.IsVisible = true;
    btnStopRec.IsVisible = false;
}

private async Task StopRecording()
{
    if (audioRecorder is not null)
    {
        var audioSource = await audioRecorder.StopAsync();

        var audioStream = audioSource.GetAudioStream();

        List<byte> totalStream = new();
        byte[] buffer = new byte[32];
        int read;

        while ((read = audioStream.Read(buffer, 0, buffer.Length)) > 0)
        {
            totalStream.AddRange(buffer.Take(read));
        }

        audioBytes = totalStream.ToArray();
    }
}
```

And, finally, when clicking the _Translate_ button, we want to grab the bytes of the recorded audio, take the language selected by the user and call our API sending the bytes and the language parameter:

```csharp
private async void Translate_Clicked(object sender, EventArgs e)
{
    if (audioBytes is not null)
    {
        lblStatus.Text = "Translating...";
        var result = await TranslateAudio(audioBytes, Picker.SelectedItem as string ?? Picker.Items.First());
        lblResult.Text = result;
        lblStatus.Text = "Translated";
    }
}

private async Task<string> TranslateAudio(byte[] bytes, string to)
{
    using (var httpClient = new HttpClient())
    {
        using (var form = new MultipartFormDataContent())
        {
            using (var fileContent = new ByteArrayContent(bytes))
            {
                fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
                form.Add(fileContent, "file", "audio");
                HttpResponseMessage response = await httpClient.PostAsync($"https://localhost:7224/translate?to={to}", form);

                return await response.Content.ReadAsStringAsync();
            }
        }
    }
}
```

The _TranslateAudio_ method returns the translated text, which we then put on the screen.

Run both your app and the API (make sure your app accesses your API on the correct port where it is running) and you should be able to record some spoken text and get it translated to the selected language.

There you have it: a very simple demo that shows how to record spoken text and get it transcribed and translated by leveraging Whisper and a GPT model. This code sample can be found on [GitHub](https://github.com/PieEatingNinjas/Whisper-translate).
