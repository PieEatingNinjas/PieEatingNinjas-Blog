---
title: "Building a Xamarin app with Azure Functions and OneDrive"
description: "Preface (you can skip this if you are not interested in the underlying idea, no hard feelings!) A while ago my brother -who sells windows (no, not the OS) and doors- asked me if I "
pubDate: "2017-01-29"
legacy: {"id":735,"path":"/2017/01/29/building-a-xamarin-app-with-azure-functions-and-onedrive/","taxonomySlugs":{"categories":["azure","c","function-app","mvvm","onedrive","xamarin","xamarinalliance"],"tags":[]}}
categories: ["C#","azure","function-app","mvvm","onedrive","xamarin","xamarinalliance"]
tags: []
---

# Preface

_**(you can skip this if you are not interested in the underlying idea, no hard feelings!)**_

A while ago my brother -who sells windows (no, not the OS) and doors- asked me if I could build a small app for his business. The key feature he wanted to have in his app is a map that would show all the references of the company. Users should then be able to filter on the type of window and the colors they are interested in and see the addresses on the map where this type of window is installed. This would make it easy for them to see how these windows and colors look like in real life. Of course this list of references should be dynamic and easy to update. My brother wouldn't mind 'updating a text file' but he has an overview of all references in Excel.

I thought this was actually a nice idea, so I decided to make a small prototype of this use case.

# The setup

The complete setup of this PoC will look something like this:

![Xamarin Azure Funtcion Overview](/wp-content/uploads/2017/01/overview.png "Xamarin Azure Funtcion Overview")

For this blogpost, I'm going to focus on the bottom part.

![Xamarin Azure Http Trigger Overview](/wp-content/uploads/2017/01/overviewpost1.png "Xamarin Azure Http Trigger Overview")

I'll dive deeper in the rest of the flow in upcoming blogposts.

# Implementing the Azure Function

So what are these Azure Functions? Azure Functions is a way to create a serverless, event-driven 'backend' on Azure. We can do all sorts of stuff with it, but in this example we are going to use it as an http endpoint that returns some XML data. Let's open up the Azure Portal and create a new Function App:

![Create new function app](/wp-content/uploads/2017/01/Create-new-function-app.jpg "Create new function app")

Give at a name, set the settings and Create it!

![Create new function app](/wp-content/uploads/2017/01/Create-new-function-app2.jpg "Create new function app")

Wait a few moments for Azure to create your Function App...

When it's created, we'll be presented with some sort of 'Quick Start' wizard. For this scenario, we'll use Webhook + API as we want to create an endpoint to request data from. And of course, we select C# as programming language (because JS isn't a real programming language... ;-) ). In fact, when we select C#, it is actually C# Script we are going to use.

![Creating new Webhook API app](/wp-content/uploads/2017/01/Creating-new-function-app-1.jpg "Creating new Webhook API app")

Create! Take a look at the code that has been generated for you.

**Default generated code**

```csharp
using System.Net;

public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, TraceWriter log)
{
    log.Info("C# HTTP trigger function processed a request.");

    // parse query parameter
    string name = req.GetQueryNameValuePairs()
        .FirstOrDefault(q => string.Compare(q.Key, "name", true) == 0)
        .Value;

    // Get request body
    dynamic data = await req.Content.ReadAsAsync<object>();

    // Set name to query string or body data
    name = name ?? data?.name;

    return name == null
        ? req.CreateResponse(HttpStatusCode.BadRequest, "Please pass a name on the query string or in the request body")
        : req.CreateResponse(HttpStatusCode.OK, "Hello " + name);
}
```

This code is executed whenever we make a request to our service. Click the 'Run' button and watch the output in the Log Window bellow. **TIP:** you can change the parameters that are used to test run you service by clicking on the '_Test_' tab on the right of your screen. There you can add query string parameters, define request headers or a request body. So, as a test, you could add a query string parameter named '_name_' and give it a value. Adjust your script by inserting this just above the return statement: `log.Info(name);`  "Save and run" and you should see the value of the name parameter being printed in your logs.

Click the '_Integrate_' tab on the left of your screen. In this screen we can specify additional inputs. Inputs are 'things' we can use inside our function. Just to be clear, this has NOTHING to do with GET or POST parameters, these are objects like a database for example that we can use inside our function. In our case, we want to specify a file in which all of our addresses are defined. Click the 'New Input' button and select 'External File (preview)'.

![Azure Function External File input](/wp-content/uploads/2017/01/Integrate-1.jpg "Azure Function External File input")

In the next screen we can configure where the service should fetch the file from. In my PoC I wanted to get the file from OneDrive. You can do this by clicking the '_new_' button next to External File connection. A blade will open up and in there you can select which api to use in order to fetch your file.

![Azure Function External File API](/wp-content/uploads/2017/01/external-file-connection.jpg "Azure Function External File API")

Once you select an API, the next step is configuring and authorizing your Function. As soon as everything is configured, the only thing you need to do is specify the path to the file you would like to access. I uploaded a small [XML-file](https://1drv.ms/u/s!AtU3InGVXXeFi6AIMYNiWi3HKVSA6g "Addresses XML file") with some addresses to my OneDrive and entered the path in  External File (Preview) input. Please note the '_File parameter name_', you can change it if you want, but we will need it in just a second.

![Azure Function External file input](/wp-content/uploads/2017/01/External-file-input.jpg "Azure Function External file input")

Click save and we can finally start to write some code!!

Back in the '_Develop tab_', the first thing we need to do, is change the signature of our Run method. We just declared this External File as input, and now we want to access it in our method. We can simply do this by adding an additional input parameter. Mind you that the name should exactly match the name you filled in as 'File parameter name'. If it doesn't match, the Log window will tell you.

**Changed Run method signature**

```csharp
using System.Net;

public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, string inputFile, TraceWriter log)
{
    ...
}
```

Now, let's write some logic! In my sample XML, I listed addresses of Ordina and Microsoft in Belgium. Via a query parameter I would like to specify of which company I would like to see the addresses. We can access the request's query string parameters via the `req` parameter. Getting the '_company_' request parameter can be done as follows:

**Getting the company from the querystring**

```csharp
using System.Net;

public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, string inputFile, TraceWriter log)
{
    log.Info("C# HTTP trigger function processed a request.");
    log.Info("\n" + inputFile);

    string requestedCompany = req.GetQueryNameValuePairs()
        .FirstOrDefault(q => q.Key.ToLower() == "company")
        .Value;

    log.Info("Requested company: " + requestedCompany);

    ...
}
```

Next we want to process our XML `inputFile` . The easiest way to do this is by using a `XDocument` and use `Linq` to get the things we are interested in. In order to be able to use `XDocument` , we need to reference the _System.Xml.Linq dll_. In C# Script -which we are using here- you can do this by adding `#r "System.Xml.Linq"` at the top of our script file. Now we can define a using for the `System.Xml.Linq`  namespace and write all of our logic:

```csharp
#r "System.Xml.Linq"

using System.Net;
using System.Xml.Linq;

public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, string inputFile, TraceWriter log)
{
        log.Info("C# HTTP trigger function processed a request.");
    log.Info("\n" + inputFile);

    string requestedCompany = req.GetQueryNameValuePairs()
        .FirstOrDefault(q => q.Key.ToLower() == "company")
        .Value;

    log.Info("Requested company: " + requestedCompany);

    var addresses = XDocument.Parse(inputFile);

    var filteredAddresses = addresses.Root.Elements("Address")
        .Where(e => (e.Attribute("company")?.Value.ToLower() == requestedCompany || 
            string.IsNullOrEmpty(requestedCompany)));

    //Creating anonymous type here to return.
    //Don't want to return XML as Azure decides to return json or xml according to the Accept-Header
    var addressesResult = filteredAddresses.Select(a => new 
    {
        Name = a.Attribute("name").Value,
        Company = a.Attribute("company").Value,
        Street = a.Element("Street").Value,
        Number = a.Element("Number").Value,
        City = a.Element("City").Value,
        PostalCode = a.Element("PostalCode").Value,
        Coords = a.Element("Coords").Value,
    });

    return req.CreateResponse(HttpStatusCode.OK, addressesResult);
}
```

As you can see in the code above, I return the resulting list as an anonymous type, and not the XML list directly. This is because Azure determines the serialization of the response data itself, using the Accept header of the request (`Application/xml`  or `Application/json` ). This way the caller of the endpoint can decide in which format he wants the result. And XML data serialized as JSON is just evil, bad, dirty, ...

When this is done, we can go and create our client, in my case I wanted to create a Xamarin client.

# Creating the Xamarin Forms Client

Nothing fancy here, I'm just going to create a very basic UI, just to show how easy it is to communicate with the Azure Function. In future posts I'll pimp up the UI for the Xamarin app. In this example, there will be a `ListView` on the page which will allow the user to select a company. The addresses of the selected company will be shown in an other `ListView` .

So go ahead and create your Xamarin Forms (XAML) project. I've added a `Address` model and a `MainViewModel` to the project so my project looks like this:

![Xamarin Solution overview](/wp-content/uploads/2017/01/solution.jpg "Xamarin Solution overview")

The `Address` model represents the addresses I get back from my Azure Function and want to display in my app.  The model looks like this:

**Address model**

```csharp
namespace DemoXamarinFunction.Model
{
    public class Address
    {
        public string Name { get; set; }
        public string Company { get; set; }
        public string Street { get; set; }
        public string Number { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public string Coords { get; set; }

        public string AddressDetails
        {
            get
            {
                return string.Format("{0} {1}, {2} {3}", Street, Number, PostalCode, City);
            }
        }
    }
}
```

**Tip:** I could very rapidly create this model by taking the a JSON response from my Azure Function, open the `Address` class, go to '_Edit_', '_Paste Special_', '_Paste JSON as Classes_'. This will generate classes that corresponds to the given JSON. It will also generate a '_RootObject_' class, but in this case I removed everything except the `Address` class. Productivity++! :-) I also added an extra property `AddressDetails` which just concats the individual properties.

As already stated, the UI of my application is really simple. So this is what the XAML of my MainPage looks like:

**MainPage Xaml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<ContentPage xmlns="http://xamarin.com/schemas/2014/forms"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:local="clr-namespace:DemoXamarinFunction"
             x:Class="DemoXamarinFunction.MainPage">
  <Grid>
    <StackLayout Padding="10">
      <Label Text="Addresses" Style="{DynamicResource TitleStyle}" Margin="0,10"/>
      <Label Text="Select Company" Style="{DynamicResource SubtitleStyle}"/>
      <ListView ItemsSource="{Binding Companies}" SelectedItem="{Binding SelectedCompany}" HeightRequest="100" />
      <Label Text="Addresses" Style="{DynamicResource SubtitleStyle}"/>
      <ListView ItemsSource="{Binding Addresses}">
        <ListView.ItemTemplate>
          <DataTemplate>
            <TextCell Text="{Binding Name}" Detail="{Binding AddressDetails}" />
          </DataTemplate>
        </ListView.ItemTemplate>
      </ListView>
    </StackLayout>
    <Grid IsVisible="{Binding IsLoading}" BackgroundColor="#AAFFFFFF">
      <ActivityIndicator IsRunning="{Binding IsLoading}" HeightRequest="50" VerticalOptions="Center"  />
    </Grid>
  </Grid>
</ContentPage>
```

In the code-behind of the MainPage.xaml, I set the `BindingContext` to a new instance of the `MainViewModel` :

**MainPage code-behind**

```csharp
public MainPage()
{
    InitializeComponent();
    this.BindingContext = new MainViewModel();
}
```

And now the final peace of the puzzle: implementing the `MainViewModel` .

First, I'm going to add the properties to the ViewModel which I want to expose to the view:

**MainViewModel properties**

```csharp
private bool _IsLoading;

public bool IsLoading
{
    get { return _IsLoading; }
    private set
    {
        if(_IsLoading != value)
        {
            _IsLoading = value;
            RaisePropertyChanged();
        }
    }
}

public List<string> Companies { get; set; }

string _SelectedCompany;

public string SelectedCompany
{
    get { return _SelectedCompany; }
    set
    {
        if(_SelectedCompany != value)
        {
            _SelectedCompany = value;
            OnSelectedCompanyChanged();
        }
    }
}

IEnumerable<Address> _Addresses;

public IEnumerable<Address> Addresses
{
    get
    {
        return _Addresses;
    }
    set
    {
        _Addresses = value;
        RaisePropertyChanged();
    }
}

public MainViewModel()
{
    Companies = new List<string>()
    {
        "Microsoft",
        "Ordina"
    };
}
```

I think all properties speak for themselves. The only thing we need to do now, is making a request to our Azure Function whenever the user selects a company. Therefore, when we set a new value to the `SelectedCompany` property, we will call a method that will talk to our function.

**OnSelectedCompanyChanged**

```csharp
private async Task OnSelectedCompanyChanged()
{
    IsLoading = true;
    try
    {
        using (var client = new HttpClient())
        {

            client.DefaultRequestHeaders.Add("Accept", "application/json");

            var url = string.Format(AZURE_FUNCTION_URI + "&company={0}", SelectedCompany.ToLower());

            var response = await client.GetAsync(url);

            var json = await response.Content.ReadAsStringAsync();

            var addresses = JsonConvert.DeserializeObject<IEnumerable<Address>>(json);

            Addresses = addresses;
        }

    }
    catch (Exception)
    {
        //Going to ignore it for now
    }
    finally
    {
        IsLoading = false;
    }
}
```

The code above is triggered whenever the `SelectedCompany` changes (user selects it from the `ListView` ). We take the URL to the HTTP Trigger Azure Function, append the extra _company_ query string parameter and do the call via the `HttpClient` . When we get a response, we read the string content; which is JSON as we specified the Accept-header to be `application/json` . We take this string and use JSON.NET to deserialize the json string to an `IEnumerable` of `Address` . Once it is deserialized, we set our property `Addressess` to these new addresses.

And that's it! That's all there is to it to get the data from our Azure function!!

# Conclusion

Although this is quite a lengthy blogpost (but with a lot of code and images ;-) ), I think it illustrates how easy and simple it is to setup a backend for your mobile app using Azure Functions. Azure functions can do a lot more than what is in this example, so go ahead and play with it, it is real fun stuff!

In following blogposts I'm going to further expand this app, like for example showing the addresses on a map, allowing a 'third party' to update the Addresses XML list, ...

If you have any further questions or remarks, you can always drop a comment below!

Enjoy!
