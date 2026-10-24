---
title: "Setting up a Realm Object Server in Azure and connect to it with Xamarin Forms"
description: "Lately I've been playing around with Realm. Realm is a very cool platform that allows us to easily build mobile apps that use things like local data storage, two-way data synchroni"
pubDate: "2017-04-16"
legacy: {"id":848,"path":"/2017/04/16/setting-up-a-realm-object-server-in-azure/","taxonomySlugs":{"categories":["azure","c","realm","xamarin"],"tags":[]}}
categories: ["C#","azure","realm","xamarin"]
tags: []
codeRepositories: ["https://github.com/PieEatingNinjas/SimpleRealmObjectServerExample"]
---

Lately I've been playing around with [Realm](https://realm.io/ "Realm"). Realm is a very cool platform that allows us to easily build mobile apps that use things like local data storage, two-way data synchronisation, real time collaboration, ... Things that typically require some coding if you want to do it yourself!

After doing some test with local data storage (I might put up a blogpost about that as well...), I wanted to do some tests where I'd store the data remotely in a Realm Object Server. But, for that ofcourse, I would need to set up my own Server in Azure... And I was surprised about how easy and quickly I could do this, so I thought I'd share this with you together with a small Xamarin Forms app that connects to this datastore.

# Setting up your VM

Go to the [Azure Portal](https://portal.azure.com/# "Azure Portal"), select _New_, _Compute_ and then select _Ubuntu Server 16.04 LTS_ in the list. A new blade will open with some additional information, just click _Create_.

Next you will need to fill in some stuff to configure your Virtual Machine give it a _Name_, select the _VM Disk type_ (I selected HDD as it isn't ment to be a production sever or something, so performance isn't that important now), type in a _Username_, _Password_, add it to an existing _Resource group_ or create a new one. Click _OK._ 

Now it is time to choose the size of your _Virtual Machine_. It's not the size that matters, they say...  Well for now, as I'm not setting up a production server or anything, I'm fine with one of the smaller VMs available in the list. I took an A1\_V2 standard with 1 core, 2 gigs. Click _Select_.

The next blade opens up where we can configure some additional settings. I'm not an IT-Pro guy, so most of the things listed here are Chinese to me, so I just clicked _OK._

Finaly we get a little summary, so just click _OK_.

While Azure is deploying our Linux Virtual Machine, please make sure you have the Linux Bash On Windows installed on your machine (or a Git bash or something like that).

# Installing the Realm Object Server on your Linux VM

Once Azure has deployed your VM, we can install the Realm Object Server on it. In Azure, go to you VM and click the 'Connect' button.

![Linux VM Connect](/wp-content/uploads/2017/04/LinuxVM.jpg)

You should see the address you can use to connect to your VM using SSH.

Open Bash on your machine and SSH to your VM. Answer 'yes' and type in your password.

![ssh to VM](/wp-content/uploads/2017/04/ssh.jpg)

Now you can install the Realm Object Server, using the guide on the Realm website: [Install Realm Object Server](https://realm.io/docs/realm-object-server/ "Install Realm Object Server")

On our Ubuntu machine, we want to execute the following commands:

```bash
# Setup Realm's package repository
curl -s https://packagecloud.io/install/repositories/realm/realm/script.deb.sh | sudo bash

# Update repositories
sudo apt-get update

# Install the Realm Object Server
sudo apt-get install realm-object-server-developer

# Enable and start the service
sudo systemctl enable realm-object-server
sudo systemctl start realm-object-server
```

At this moment, our Object Server is running on our VM, but we can't connect to it just yet. That's because, by default, Azure only allows an SSH connection to this VM. So we need to change that.

In Azure, use the search box at the top of the page, and type the name of your virtual machine. You should see your _Virtual Machine_ itself together with its _Network Interface_ and _Security Group_. Click the _Network Security Group_.

![VM network Security Group](/wp-content/uploads/2017/04/VM-network-Security-Group.jpg)

On the Network security group blade, click on _Inbound security rules._ On the new blade that opens up, click the _Add_ button in the top left corner. Now you can configure the new _Inboud Security Rule._ I named this rule 'Realm', left everything to its default values, except for _Port range_. In the Realm documentation, we can read that all communication to the Realm Object Server is done over port 9080, so this is the port we would like to open. Fill in 9080 in the _Port range_ field and click OK.

# Initialize Realm Object Server

You should now be able to use your internet browser and browse to the IP address of your VM (the same you used for SSH) for port 9080 (http://_VM-ipaddress_:9080). On this page you can now configure an Admin user for your Object Server. Check the 'I Agree'-box and click the _Complete setup_ button.

**Congratulations! Your Realm Object Server is now up and running!** :-)

On the Realm Object Server dashboard, go to Users and create a new User if we want.

# Good news everyone: we can now start coding!

I'll show a small example in Xamarin Forms: just a basic Task/ToDo list app that uses Realm to store its data localy and remote in our newly created Object Server.

Here's what our Task model looks like:

```csharp
public class Task : RealmObject
{
    public string Title { get; set; }
    public string Description { get; set; }
    public bool IsComplete { get; set; }
}
```

For the Task object, I've also built a ViewModel:

```csharp
public class TaskViewModel : INotifyPropertyChanged
{
    Task Task;

    public string Title { get { return Task.Title; } }
    public string Description { get { return Task.Description; } }

    public bool IsComplete
    {
        get
        {
            return Task.IsComplete;
        }
    }

    public ICommand DeleteCommand { get; set; }
    public ICommand ToggleIsCompleteCommand { get; set; }

    public TaskViewModel(Task task)
    {
        Task = task;
        DeleteCommand = new Command(OnDelete);
        ToggleIsCompleteCommand = new Command(OnToggleComplete);
    }

    private void OnToggleComplete(object obj)
    {
        MessagingCenter.Send(this, "UPDATEISCOMPLETE", Task);
    }

    private void OnDelete(object obj)
    {
        MessagingCenter.Send(this, "DELETE", Task);
    }

    public void OnPropertyChanged([CallerMemberName]string property = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

The MainPage itself is just a ListView that shows all of my Tasks. At the bottom of the page, I have 2 Entries and a Button that I can use to add a Task to my list:

```xml
<ContentPage xmlns="http://xamarin.com/schemas/2014/forms"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             xmlns:local="clr-namespace:SimpleRealmObjectServerExample"
             x:Class="SimpleRealmObjectServerExample.MainPage">
    <ContentPage.Resources>
        <ResourceDictionary>
            <local:IsCompleteToColorConverter x:Key="isCompleteToColorConverter" />
         </ResourceDictionary>
    </ContentPage.Resources>
    <Grid Margin="0, 50, 0, 0">
        <Grid.RowDefinitions>
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>
        <ListView ItemsSource="{Binding Tasks}">
            <ListView.ItemTemplate>
                <DataTemplate>
                    <TextCell Text="{Binding Title}" Detail="{Binding Description}" 
                              TextColor="{Binding IsComplete, Converter={StaticResource isCompleteToColorConverter}}">
                        <ViewCell.ContextActions>
                            <MenuItem Command="{Binding ToggleIsCompleteCommand}" CommandParameter="{Binding .}" 
                                          Text="Toggle IsComplete" IsDestructive="false" />
                            <MenuItem Command="{Binding DeleteCommand}" CommandParameter="{Binding .}" 
                                          Text="Delete" IsDestructive="True" />
                        </ViewCell.ContextActions>
                    </TextCell>
                </DataTemplate>
            </ListView.ItemTemplate>
        </ListView>
        <Grid Grid.Row="1">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto" />
                <ColumnDefinition Width="*" />
            </Grid.ColumnDefinitions>
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto" />
                <RowDefinition Height="Auto" />
                <RowDefinition Height="Auto" />
            </Grid.RowDefinitions>
            <Label Text="Title" />
            <Entry Text="{Binding NewTaskTitle, Mode=TwoWay}" Grid.Column="1"/>
            <Label Text="Description" Grid.Row="1" />
            <Entry Text="{Binding NewTaskDescription, Mode=TwoWay}" Grid.Row="1" Grid.Column="1"/>
            <Button Grid.ColumnSpan="2" Grid.Row="2" HorizontalOptions="Center" 
                    Text="Create" Command="{Binding CreateCommand}" />
        </Grid>
        <Grid IsVisible="{Binding IsLoading}"  
              Grid.RowSpan="2" BackgroundColor="White"
              VerticalOptions="FillAndExpand" 
              HorizontalOptions="FillAndExpand">
            <ActivityIndicator IsRunning="{Binding IsLoading}" 
                               HorizontalOptions="Center" VerticalOptions="Center" />
        </Grid>
    </Grid>
</ContentPage>
```

And my MainPageViewModel ties everything together:

```csharp
public class MainPageViewModel : INotifyPropertyChanged
{
    Realm Realm;

    public ObservableCollection<TaskViewModel> Tasks
    {
        get;
        set;
    } = new ObservableCollection<TaskViewModel>();

    private string _NewTaskTitle;

    public string NewTaskTitle
    {
        get { return _NewTaskTitle; }
        set
        {
            if (_NewTaskTitle != value)
            {
                _NewTaskTitle = value;
                OnPropertyChanged();
            }

        }
    }

    private string _NewTaskDescription;

    public string NewTaskDescription
    {
        get { return _NewTaskDescription; }
        set
        {
            if (_NewTaskDescription != value)
            {
                _NewTaskDescription = value;
                OnPropertyChanged();
            }

        }
    }

    private bool _IsLoading;

    public bool IsLoading
    {
        get { return _IsLoading; }
        set
        {
            _IsLoading = value;
            OnPropertyChanged();
        }
    }

    public ICommand CreateCommand { get; private set; }

    public MainPageViewModel()
    {
        CreateCommand = new Command(OnCreate);
        InitializeMessages();
        InitAsync();
    }

    private void InitializeMessages()
    {
        MessagingCenter.Subscribe<TaskViewModel, Task>(this, "DELETE",
            (sender, task) =>
            {
                Realm.Write(() =>
                    Realm.Remove(task)
                );
            });

        MessagingCenter.Subscribe<TaskViewModel, Task>(this, "UPDATEISCOMPLETE",
            (sender, task) =>
            {
                Realm.Write(() =>
                    task.IsComplete = !task.IsComplete
                 );
                sender.OnPropertyChanged(nameof(TaskViewModel.IsComplete));
            });
    }

    private void OnCreate(object obj)
    {
        Realm.Write(() =>
            Realm.Add(new Models.Task()
            {
                Title = NewTaskTitle,
                Description = NewTaskDescription
            })
        );

        NewTaskTitle = string.Empty;
        NewTaskDescription = string.Empty;
    }

    private async System.Threading.Tasks.Task InitAsync()
    {
        IsLoading = true;
        await InitRealmAsync();
        Load();
        IsLoading = false;
    }

    private void Load()
    {
        var tasks = Realm.All<Models.Task>().AsRealmCollection();
        tasks.SubscribeForNotifications(OnCollectionUpdated);
        OnCollectionUpdated(tasks, null, null);
    }

    private async System.Threading.Tasks.Task InitRealmAsync()
    {
        var user = await GetRealmUserAsync();
        var serverURL = new Uri(Constants.RealmServerUrl);
        var configuration = new SyncConfiguration(user, serverURL);

        Realm = Realm.GetInstance(configuration);
    }

    private void OnCollectionUpdated(IRealmCollection<Task> sender, ChangeSet changes, Exception error)
    {
        //very naive implementation :)
        //OK for demo purposes
        Tasks.Clear();
        foreach (var item in sender)
        {
            Tasks.Add(new TaskViewModel(item));
        }
    }

    private async System.Threading.Tasks.Task<User> GetRealmUserAsync()
    {
        User user = null;
        User.ConfigurePersistence(UserPersistenceMode.NotEncrypted);

        if (User.AllLoggedIn.Count() > 1)
            foreach (var item in User.AllLoggedIn)
            {
                item.LogOut();
            }

        user = User.Current;
        if (user == null)
        {
            var credentials = Credentials.UsernamePassword(Constants.DefaultUser, 
                Constants.DefaultPassword, createUser: false);

            var authURL = new Uri(Constants.AuthUrl);
            user = await User.LoginAsync(credentials, authURL);
        }

        return user;
    }

    public void OnPropertyChanged([CallerMemberName]string property = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(property));
    }

    public event PropertyChangedEventHandler PropertyChanged;
}
```

Let's take a look at some Realm specific code. Connecting to our Realm Object Server can be done by calling the static `GetInstance`  method on the `Realm`  object. As a parameter we can pass a `SyncConfiguration` . This `SyncConfiguration`  is nothing more or nothing less than the user that is connecting and the url to you Object server:

```csharp
var serverURL = new Uri(Constants.RealmServerUrl);
var configuration = new SyncConfiguration(user, serverURL);

Realm = Realm.GetInstance(configuration);
```

We can now use this Realm object to get our objects or to write, update or delete them from our data store.

**Get list of items from the datastore**

```csharp
var tasks = Realm.All<Models.Task>().AsRealmCollection();
```

**Remove item from the datastore**

```csharp
Realm.Write(() =>
    Realm.Remove(task)
);
```

**Update an item in the datastore**

```csharp
Realm.Write(() =>
    task.IsComplete = !task.IsComplete
 );
```

**Add an item to the datastore**

```csharp
Realm.Write(() =>
    Realm.Add(new Models.Task()
    {
        Title = NewTaskTitle,
        Description = NewTaskDescription
    })
);
```

You can find the code on my GitHub: [SimpleRealmObjectServerExample](https://github.com/PieEatingNinjas/SimpleRealmObjectServerExample "SimpleRealmObjectServerExample")

Enjoy!
