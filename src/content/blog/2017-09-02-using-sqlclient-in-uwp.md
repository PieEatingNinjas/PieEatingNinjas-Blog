---
title: "Using SqlClient in UWP"
description: "Hello .NET Standard 2.0 A week or so ago, Visual Studio Preview 15.4 released and I was pretty excited about this! Why? Well, Visual Studio 2017 version 15.4 Preview brings first c"
pubDate: "2017-09-02"
legacy: {"id":963,"path":"/2017/09/02/using-sqlclient-in-uwp/","taxonomySlugs":{"categories":["c","fall-creators-update","uwp"],"tags":[]}}
categories: ["C#","fall-creators-update","uwp"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/SqlClientOnUWP"]
---

# Hello .NET Standard 2.0

A week or so ago, _Visual Studio Preview 15.4_ released and I was pretty excited about this! Why? Well, _Visual Studio 2017 version 15.4 Preview_ brings first class support for developers targeting the _Windows Fall Creators Update SDK_ preview. This _Windows Fall Creators Update_ brings support for [.NET Standard 2.0](https://blogs.msdn.microsoft.com/dotnet/2017/08/14/announcing-net-standard-2-0/ ".NET Standard 2.0") to UWP which means we now have a set of 19k additional APIs we can acces (compared to .NET Standard 1.6).

And personally, I'm most excited about the SqlClient APIs.

# SqlClient & UWP?

Yes! We now have access to the APIs that live in the System.Data.SqlClient namespace, meaning we can now access Sqlserver databases directly from within our UWP app. This is yet another step in the direction of making UWP a good fit for LOB applications. Countless LOB applications have been written in the past that use Sqlserver Express on the client to store data locally.

# Show me how

At the moment of writing, the _Windows Fall Creators Update SDK_ is still in preview, so you have to download it from [here](https://www.microsoft.com/en-us/software-download/windowsinsiderpreviewSDK "Windows Insider Preview SDK"). The same thing goes for _Visual Studio 15.4_ which you can find [here](https://www.visualstudio.com/en-us/news/releasenotes/vs2017-preview-relnotes "VS 2017 Preview").

First, create a new UWP project and select _Windows 10 Insider Preview (10.0; Build 16267)_ as Target Version and Minimum Version.

[![Minimum and Target Version](/wp-content/uploads/2017/09/Version.jpg)](/wp-content/uploads/2017/09/Version.jpg)

Once this is done, we can use the SqlClient APIs just like we've always been doing in WPF or WinForms.

And what better way to demo this using the Northwind DB? :-)

## But first, some UI

A very simple UI with a `TextBox`, a search `Button`  and a `ListView`  to show the results. Also provide a loading message while the app is querying the database.

**Xaml**

```xml
<Page
    x:Class="SQLserverDemoUWP.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:models="using:SQLserverDemoUWP.Models"
    xmlns:conv="using:SQLserverDemoUWP.Converters"
    mc:Ignorable="d">
    <Page.Resources>
        <conv:BoolToVisibilityConverter x:Key="boolToVisibilityConverter" />
    </Page.Resources>
    <Grid Background="{ThemeResource ApplicationPageBackgroundThemeBrush}">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*" />
            <ColumnDefinition Width="Auto" />
        </Grid.ColumnDefinitions>
        <TextBox Text="{x:Bind ViewModel.SearchString, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}" />
        <Button Grid.Column="1" Content="Search in Northwind"
            Click="{x:Bind ViewModel.OnSearch}" />
        <StackPanel Grid.Row="1" Grid.ColumnSpan="2">
            <TextBlock Text="{x:Bind ViewModel.ResultText, Mode=OneWay}" />
            <ListView  ItemsSource="{x:Bind ViewModel.Result, Mode=OneWay}">
                <ListView.ItemTemplate>
                    <DataTemplate x:DataType="models:Product">
                        <StackPanel>
                            <TextBlock Text="{x:Bind ProductName}" FontWeight="Black" />
                            <TextBlock Text="{x:Bind QuantityPerUnit}" FontStyle="Italic" />
                            <TextBlock>
                                <Run Text="{x:Bind UnitPrice}"/><Run Text="$" />
                            </TextBlock>
                        </StackPanel>
                    </DataTemplate>
                </ListView.ItemTemplate>
            </ListView>
        </StackPanel>
        <Grid Grid.ColumnSpan="2" Grid.RowSpan="2" Background="White"
              Visibility="{x:Bind ViewModel.IsLoading, Converter={StaticResource boolToVisibilityConverter}, Mode=OneWay}">
            <StackPanel VerticalAlignment="Center">
                <TextBlock HorizontalAlignment="Stretch" TextAlignment="Center" VerticalAlignment="Center" TextWrapping="WrapWholeWords">
                    <Run Text="Searching Northwind for '"/><Run Text="{x:Bind ViewModel.SearchString, Mode=OneWay}" /><Run Text="'..." />
                </TextBlock>
                <ProgressRing IsActive="{x:Bind ViewModel.IsLoading, Mode=OneWay}" />
            </StackPanel>
        </Grid>
    </Grid>
</Page>
```

**MainPageViewModel**

```csharp
public class MainPageViewModel : INotifyPropertyChanged
{
    readonly NorthwindRepository Repository;

    private string _SearchString;

    public string SearchString
    {
        get { return _SearchString; }
        set
        {
            if (_SearchString != value)
            {
                _SearchString = value;
                RaisePropertyChanged();
            }
        }
    }

    private List<Product> _Result;

    public List<Product> Result
    {
        get { return _Result; }
        set { _Result = value; RaisePropertyChanged(); }
    }

    private bool _IsLoading;

    public bool IsLoading
    {
        get { return _IsLoading; }
        set
        {
            if (_IsLoading != value)
            {
                _IsLoading = value;
                RaisePropertyChanged();
            }
        }
    }

    private string _ResultText;

    public string ResultText
    {
        get { return _ResultText; }
        set
        {
            if (_ResultText != value)
            {
                _ResultText = value;
                RaisePropertyChanged();
            }
        }
    }

    public MainPageViewModel()
    {
        Repository = new NorthwindRepository();
    }


    public async void OnSearch()
    {
        try
        {
            IsLoading = true;
            Result = null;
            Result = await Repository.SearchProducts(SearchString);

            if (Result.Any())
                ResultText = $"Results for {SearchString}:";
            else
                ResultText = $"Search string '{SearchString}' returned no items";
        }
        catch (Exception)
        {
            //ToDo
        }
        finally
        {
            SearchString = null;
            IsLoading = false;
        }
    }

    public void RaisePropertyChanged([CallerMemberName]string property = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

## Now, query all the things

For this demo I've built a Northwind repository with just one method: _Search_. In this method we are just using the SqlClient APIs that we know. We define our query, make a connection to the DB, pass in the query parameter  in the _SqlCommand_ and finally execute the command. Once we get the result back, we make an instance of a _Product_ for each line and return them.

**NorthwindRepository**

```csharp
public class NorthwindRepository
{
    private readonly string connectionString =
       @"Server=localhost\SQLEXPRESS;Database=Northwind; User Id=me; Password=mypsswd";

    public async Task<List<Product>> SearchProducts(string query)
    {
        return await Task.Run<List<Product>>(() =>
        {
            List<Product> result = new List<Product>();
            string queryString =
                      "SELECT ProductName, UnitPrice, QuantityPerUnit "
                    + "FROM dbo.products "
                    + "WHERE ProductName like '%' + @query + '%'"
                    + "ORDER BY ProductName DESC;";

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                SqlCommand command = new SqlCommand(queryString, connection);
                command.Parameters.AddWithValue("@query", query);

                try
                {
                    connection.Open();
                    SqlDataReader reader = command.ExecuteReader();
                    while (reader.Read())
                    {
                        result.Add(new Product
                        {
                            ProductName = reader.GetString(0),
                            UnitPrice = reader.GetDecimal(1),
                            QuantityPerUnit = reader.GetString(2)
                        });
                    }
                    reader.Close();
                }
                catch (Exception)
                {
                    throw;
                }
                return result;
            }
        });
    }
}
```

In the above code, you'll notice that I've surrounded it all with `Task.Run`. I do this because the SqlClient APIs aren't async. But methods like `ExecuteReader`  can take long to process. In order to keep our UI responsive, I've put this all inside a `Task`  so I can use the `async/await`  pattern.

# That's all, folks

Aaah, we can finally -with UWP implementing .NET Standard 2.0- use the SqlClient APIs (and others). This really opens up the potential of UWP for LOB app even more! I like it!

You can find the code of this blogpost on my [GitHub](https://github.com/PieEatingNinjas/SqlClientOnUWP "SqlClient on UWP").
