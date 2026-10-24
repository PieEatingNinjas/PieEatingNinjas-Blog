---
title: "Reading Belgian eID in UWP using SmartCardReader"
description: "I couldn't find any samples to read a Belgian Electronic Identity Card in a UWP application. With the DeviceInformation and SmartCardReader classes it is very easy to access the de"
pubDate: "2020-02-15"
legacy: {"id":1618,"path":"/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/","taxonomySlugs":{"categories":["apdu","c","eid","uwp"],"tags":[]}}
categories: ["C#","apdu","eid","uwp"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/eIDReader"]
---

I couldn't find any samples to read a Belgian Electronic Identity Card in a UWP application.

With the [DeviceInformation](https://docs.microsoft.com/en-us/uwp/api/Windows.Devices.Enumeration.DeviceInformation) and [SmartCardReader](https://docs.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardreader) classes it is very easy to access the devices/readers connected to your PC. But how do you get information like name, addres, identification number, nationality, date of birth, birth location, gender, ... from the eID card? After some research I was able to succesfully send APDU (Application Protocol Data Unit) commands to the card, read the responses and parse the requested data. Let me show you how.

# TL;DR

Are you just looking for a working library or samples and not (yet) interested in the technical details? Take a look at the [links at the bottom of this blogpost](/#links).

# Connecting to a device

This is the easy part! UWP has very simple APIs to get your devices and to connect with them. These eID readers I tested (USB, onboard readers,...) are 'Smart Card Readers' to the system.

The DeviceInformation class has an interesting [FindAllAsync method](https://docs.microsoft.com/en-us/uwp/api/windows.devices.enumeration.deviceinformation.findallasync#Windows_Devices_Enumeration_DeviceInformation_FindAllAsync_System_String_) that accepts a AQS (Advanced Query Syntax) filter. As we are only interested in Smart Card Readers, we can use the static [GetDeviceSelector method](https://docs.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardreader.getdeviceselector#Windows_Devices_SmartCards_SmartCardReader_GetDeviceSelector) on the SmartCardReader class to get the AQS string for smart card readers.

To get a list of all smart card readers on our system, we can do the following:

```csharp
string selector = SmartCardReader.GetDeviceSelector(); 
DeviceInformationCollection smartCardReaders = await DeviceInformation.FindAllAsync(selector);
```

This [DeviceInformationCollection](https://docs.microsoft.com/en-us/uwp/api/windows.devices.enumeration.deviceinformationcollection) contains [DeviceInformation](https://docs.microsoft.com/en-us/uwp/api/windows.devices.enumeration.deviceinformation) objects which contain some generic information like Name, Id, ...

Connecting to a specific device is as easy as passing the Id of the DeviceInformation class to the [SmartCardReader.FromIdAsync](https://docs.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardreader.fromidasync) method.

```csharp
SmartCardReader reader =
       await SmartCardReader.FromIdAsync(device.Id);

IReadOnlyList<SmartCard> cards =
    await reader.FindAllCardsAsync();

var card = cards.FirstOrDefault();

if (card == null)
    throw new NoCardFoundException();

SmartCardConnection connection = await card.ConnectAsync();
```

As you can see in the code above, as soon we have access to the reader, we can query the cards on that device. Once we have a card, we can create a [SmartCardConnection](https://docs.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardconnection) and start communicating with it.

_**Before calling `SmartCardReader.FromIdAsync(device.Id);` you need to make sure that the Shared User Certificates capability is set in your appxmanifest! Else you will get a System.UnauthorizedAccessException!**_

# Sending commands

Sending the commands is litteraly calling just one method! The [TransmitAsync method](https://docs.microsoft.com/en-us/uwp/api/windows.devices.smartcards.smartcardconnection.transmitasync#Windows_Devices_SmartCards_SmartCardConnection_TransmitAsync_Windows_Storage_Streams_IBuffer_) on the SmartCardConnection class is there to do this! The 'tricky' part with this is that this method takes an IBuffer and returns an IBuffer. So we can basically send anything over this connection. The question is: WHAT commands to send to get the data we want?

## APDU commands

Application Protocol Data Unit (APDU) commands are the things we need to send to the card via the TransmitAsync method.

After digging into the [reference manual](/wp-content/uploads/2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf) of the (Belgian) eID card, I was able to determine what APDU commands to send. It turns out the information is stored in 'files' on the card. In order to read a particular file, we first need to send a command to 'select' the file, followed by a command to 'read' its contents.

### Select file command

The select file command is a byte array that is structured like this:

![Select APDU documentation](/wp-content/uploads/2020/02/SelectAPDU.jpg)

This would mean that if we would like to select the 'Address' file, our select command would look like this:

```csharp
protected readonly byte[] SELECT_ADDRESS_APDU_COMMAND = new byte[] {
                    0x00, //CLA   
                    0xA4, //INS  
                    0x08, //P1  => absolute path
                    0x0C, //P2 
                    0x06, //Length of the path
                    //ADDRESS FILE PATH
                    0x3F,// directory MF "3f00"  
                    0x00,
                    0xDF,// subdirectory identity DF(ID) "DF01"  
                    0x01,
                    0x40,// address file EF(ID#Address) "4033" 
                    0x33
};
```

The paths of the files can be deducted from the [Belgian eID content document](/wp-content/uploads/2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf).

Similarly, for getting the 'ID' file, the select command would look like this:

```csharp
protected readonly byte[] SELECT_ID_APDU_COMMAND = new byte[] {
                    0x00, //CLA   
                    0xA4, //INS  
                    0x08, //P1  => absolute path
                    0x0C, //P2 
                    0x06, //Length of the path
                    //ID FILE PATH
                    0x3F,//directory MF "3f00"  
                    0x00,
                    0xDF,//subdirectory identity DF(ID) "DF01"  
                    0x01,
                    0x40,//identity file EF(ID#RN) "4031"  
                    0x31
};
```

As said before, sending a APDU command to the card can be done by calling the TransmitAsync method on the SmartCardConnection class:

```csharp
var result = await conn.TransmitAsync(SELECT_ADDRESS_APDU_COMMAND.AsBuffer());
CryptographicBuffer.CopyToByteArray(result, out byte[] response);
```

According to the documentation, if the status bytes of the response are set to '90 00', this indicates 'Normal ending of the command'.

![Select APDU Response documentation](/wp-content/uploads/2020/02/SelectAPDUResponse.jpg)

That means we can easily check if we succesfuly selected the file we asked like this:

```csharp
if (response?.Length == 2 &&
     (ushort)((response[0] << 8) + response[1]) == 0x9000)
{
    //We're good!
}
else
{
    //We didn't get a OK status when selecting the file
    //We are unable to read the card
    throw new ReadCardException();
}
```

### Read file command

The above commands show how to 'select' a particuale, at the time we are not accessing the file yet. To read the contents of the selected file, a subsequent read command needs to be set. The read command itself is pretty simple, but there is one catch...

![Read APDU command documentation](/wp-content/uploads/2020/02/ReadAPDU.jpg)

The tricky part here is the 'Le' parameter. You don't always know the lenght of the data you want to read. Address data for example has a fixed length, but the ID file hasn't. But when looking closely into the documentation, there's this status we can get back from the read command:

![Le Incorrect](/wp-content/uploads/2020/02/leIncorrect.jpg)

This means that if we specify a lenght (Le) of 0, we should get back a status where the first byte is 6C and the second byte will indicate the length of the data that is available. Thus, after getting this status, we can again do a read command passing in the correct Le parameter.

```csharp
private byte[] GetReadCommand(int length = 0)
{
    return new byte[] {
                    0x00, //CLA   
                    0xB0, //Read binary command  
                    0x00, //OFF_H higher byte of the offset (bit 8 = 0)  
                    0x00,
                    (byte)length //le
    };
}


byte[] fileContents = null;

result = await conn.TransmitAsync(GetReadCommand().AsBuffer());
CryptographicBuffer.CopyToByteArray(result, out byte[] readResponse);

if (readResponse?.Length == 2 &&
     readResponse[0] == 0x6C)
{
    //Getting back 0x6C, Length is in second byte
    result = await conn.TransmitAsync(GetReadCommand(readResponse[1]).AsBuffer());
    CryptographicBuffer.CopyToByteArray(result, out fileContents);
}
else
{
    //Don't think this should occur...
    CryptographicBuffer.CopyToByteArray(result, out fileContents);
}
//Raw contents of file is in fileContents array
```

Now that we have the raw data of a file (as a byte array), we need to look how to parse this data into something meaningful.

# Parsing raw data

In the [Belgian eID content document](/wp-content/uploads/2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf) you can find an overview of how the data is structured per file. For example the address file is structured like this:

![Address file structure](/wp-content/uploads/2020/02/Addressfile-contents.jpg)

The ID file is structured similarly with tags and length preceding each field. Now that we know this, we can write a loop that reads the data sequentially and puts it in something more useful for us:

```csharp
private Dictionary<byte, string> ReadData(byte[] rawData, List<byte> tags)
{
    var data = tags.ToDictionary(k => k, v => "");

    int idx = 0; //we start at 0 :-)
    while (idx < rawData.Length)
    {
        byte tag = rawData[idx]; //at this location we have a Tag
        idx++;
        var length = rawData[idx]; //the next position holds the lenght of the data
        idx++;  //start of the data

        if (tags.Contains(tag)) //this is a tag we are interested in
        {
            var res = new byte[length]; //create array to put data of this tag in. We know the length
            Array.Copy(rawData, idx, res, 0, length); //fill

            var value = Encoding.UTF8.GetString(res); //convert to string

            data[tag] = value; //put the string value we read in the data dictionary
        }
        idx += length; //moving on, skipping the length of data we just read
    }
    return data;
}
```

Reading address data for example can then be done like this:

```csharp
const byte ADDRESS_STREET_NUMBER_TAG = 0x01;
const byte ADDRESS_ZIP_CODE_TAG = 0x02;
const byte ADDRESS_MUNICIPALITY_TAG = 0x03;


var data = ReadData(fileContents, new List<byte>()
{
    ADDRESS_STREET_NUMBER_TAG,
    ADDRESS_ZIP_CODE_TAG,
    ADDRESS_MUNICIPALITY_TAG
});

var street = data[ADDRESS_STREET_NUMBER_TAG];
var zip = data[ADDRESS_ZIP_CODE_TAG];
var muni = data[ADDRESS_MUNICIPALITY_TAG];
```

We get the data back in a dictionary where the keys are the tags, which we can define as constants with a meaningful name.

Success! We managed to read the contents of a Belgian eID in UWP!

**NOTE: debugging it step by step can be pretty hard as the connection to the card times out rather quickly, resulting in an exception saying : 'The smart card has been reset, so any shared state information is invalid. (Exception from HRESULT: 0x80100068)'**

# Links

## GitHub

You can find my [library on GitHub](https://github.com/PieEatingNinjas/eIDReader/tree/master), the simplified code samples (not using the library) used in this blogpost can be found on [a separate branch](https://github.com/PieEatingNinjas/eIDReader/tree/UWPSample).

More information about using the (NuGet) library can be found on the [Wiki page on GitHub](https://github.com/PieEatingNinjas/eIDReader/wiki).

## NuGet

A library to read the contents of an eID card is available on [NuGet](https://www.nuget.org/packages/PieEatingNinjas.EIdReader.UWP/).

## Documentation eID (referenced in the blogpost)

[Reference Manual](/wp-content/uploads/2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf) [Belgian eID Content document](/wp-content/uploads/2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf)

Documentation source: the PDFs linked above are hosted locally for preservation. The source documents are available in the [official Belgian eID middleware repository](https://github.com/Fedict/eid-mw).
