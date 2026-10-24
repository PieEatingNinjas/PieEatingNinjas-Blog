---
title: "Distributing WPF/WinForms applications using AppCenter and msix"
description: "Some time ago, Microsoft announced WPF and WinForms support for Visual Studio AppCenter. I almost immediately tried it out in order to share my experiences on my blog. But, unfortu"
pubDate: "2019-08-29"
legacy: {"id":1517,"path":"/2019/08/29/distributing-wpf-winforms-applications-using-appcenter-and-msix/","taxonomySlugs":{"categories":["appcenter","uwp","visual-studio"],"tags":[]}}
categories: ["appcenter","uwp","visual-studio"]
tags: []
---

Some time ago, Microsoft [announced WPF and WinForms support for Visual Studio AppCenter](https://devblogs.microsoft.com/appcenter/announcing-wpf-and-winforms-support-in-visual-studio-app-center/). I almost immediately tried it out in order to share my experiences on my blog. But, unfortunately, I was halted because of [a bug](https://github.com/microsoft/appcenter-sdk-dotnet/issues/1089) I discovered and I didn't want to focus on that too much. Hence I waited for the bug to be fixed.  The good news is that after a few days, the engineers at Microsoft already fixed the issue in the latest beta package! It proves that it is really valuable to try out some early beta stuff so you can provide feedback to the team!

Time to take it for a spin!

# Similar to other platforms

Basically we can do much of the same things that we do with AppCenter on WPF or WinForms like on other platforms and technologies. Nothing new if you've already used AppCenter on other clients.

The usage of the SDK is well documented on docs. Take a look there to get up and running!

[Setup](https://docs.microsoft.com/en-us/appcenter/sdk/getting-started/wpf-winforms) [Analytics](https://docs.microsoft.com/en-us/appcenter/sdk/analytics/windows) [Crash reporting](https://docs.microsoft.com/en-us/appcenter/sdk/crashes/wpf-winforms)

# Distributing WPF application

Besides the things shortly mentioned above, we can also use Visual Studio AppCenter to distribute our WPF or WinForms applications packed as a msix package. Visual Studio AppCenter is always been a 'pick the features you want to use' solution. If you want to do crash reporting with AppCenter, you are not obliged to use any other feature. Or if you just want to use AppCenter to distribute you application to testers, you can just do that. In that case you don't need to do any modifications in your app for that.

Let's see how we can distribute a WPF application as a msix package through AppCenter.

First, you need to add a Windows Application Packaging Project to you solution.

![](/wp-content/uploads/2019/08/packaging.jpg)

Once the project is added, you need to right-click 'Applications' and add a reference to your WPF project.

![](/wp-content/uploads/2019/08/addreference.jpg)

This project has a Package.appxmanifest file. You can click on it to change your application's display name, visual assets for the application's tile, ...

When packaging you application, you'll need to have a certificate to sign your package. If you want, for testing purposes, you can create a self signed certificate. All information for creating a self-signed certificate can be found here: [Create a certificate for package signing](https://docs.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing)

To package your application, right-click the packaging project, select Store and click in Create App Packages. In the wizard, select 'Sideloading', Next, select the certificate you want to use to sign the app package and finally give your package a Version Number and select the Architectures and Solution Configuration for which you want to create the packages.

Visual Studio will do its thing and you'll end up with a lot of files being generated, one of them is the msixbundle file.

Now our work in Visual Studio is done, we can now move over to AppCenter.

In AppCenter, navigate to Distribute

![](/wp-content/uploads/2019/08/distribute.jpg)

On this page you can see all the versions of your application you've released. You can create a new release by clicking on the button and uploading your msixbundle. Additionally you can provide some release notes (which supports markdown btw). Next you need to select to which users (individual or groups) you want to distribute your application to. Click distribute and your release will be created and your selected testers will receive an email indicating a new release is available (that is if you didn't check the 'Do not notify Testers' checkbox of course).

![](/wp-content/uploads/2019/08/email.jpg)

Testers can now install the application and start testing. Easy, right?

# Conclusion

I'm pretty excited Visual Studio AppCenter is coming to WPF and WinForms. I've been using it a lot in my Xamarin and UWP apps for crash reporting and for alfa/beta distribution. Packing WPF or WinForms applications as msix is, by all means, a good idea. I think the fact that I can now use AppCenter to distribute alfa/beta/... packages easily to my testers is really cool!
