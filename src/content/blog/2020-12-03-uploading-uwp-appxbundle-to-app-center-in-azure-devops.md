---
title: "Uploading UWP AppxBundle to App Center in Azure DevOps"
description: "App Center is a great way to distribute (alpha/beta) releases of your Windows or UWP app to (internal) testers. Especially when you make the distribution to App Center a part of yo"
pubDate: "2020-12-03"
legacy: {"id":1689,"path":"/2020/12/03/uploading-uwp-appxbundle-to-app-center-in-azure-devops/","taxonomySlugs":{"categories":["appcenter","automation","azure-devops","uwp"],"tags":[]}}
categories: ["appcenter","automation","azure-devops","uwp"]
tags: []
---

App Center is a great way to distribute (alpha/beta) releases of your Windows or UWP app to (internal) testers.

Especially when you make the distribution to App Center a part of your pipelines. You commit (or trigger it manually) and \*bam\* moments later, your testers can test out the awesome changes you made to your app!

Some time ago, however, I struggled getting my AppxBundle to App Center. Everything would just run, no error messages of whatsoever, but in AppCenter my new build wouldn't show up.

This is what the 'distribute to App Center step' in my Azure DevOps pipeline looked like:

```yaml
- task: AppCenterDistribute@3
  inputs:
    serverEndpoint: 'AppCenterConnection'
    appSlug: '[*redacted*]'
    appFile: '$(Build.ArtifactStagingDirectory)\AppxPackages\*\*.appxbundle'
    symbolsOption: 'UWP'
    releaseNotesOption: 'input'
    releaseNotesInput: 'New release'
    destinationType: 'groups'
    distributionGroupId: '$(appCenter.distributionGroupId)'
    buildVersion: '$(Build.BuildNumber)'
```

This would run just fine, but I wouldn't see anything appearing in AppCenter.

![](/wp-content/uploads/2020/12/noreleases.jpg)

After some investigation, it turned out that the problem was due to the fact that the version number in my app manifest didn't match the version number I passed in as 'buildVersion' parameter when pushing the appxbundle to App Center.

So the fix is simple: leave out the 'buildVersion' parameter. On the other hand, it's a bit of a 'smell' as well... Shouldn't your manifest have the same version as your build?  I would suggest to include an extra step in you pipeline to update your app manifest so the version matches your buildnumber. This can be very valuable in terms of tracebility!

# Leave the buildVersion parameter out

When uploading an appxbundle, we can leave the buildVersion parameter out. AppCenter will automatically pick the version number from your app manifest:

```yaml
- task: AppCenterDistribute@3
  inputs:
    serverEndpoint: 'AppCenterConnection'
    appSlug: '[*redacted*]'
    appFile: '$(Build.ArtifactStagingDirectory)\AppxPackages\*\*.appxbundle'
    symbolsOption: 'UWP'
    releaseNotesOption: 'input'
    releaseNotesInput: 'New release'
    destinationType: 'groups'
    distributionGroupId: '$(appCenter.distributionGroupId)'
```

# ![](/wp-content/uploads/2020/12/version.jpg)

# Update Manifest version

As said, you should certainly think about adding an extra step to make sure the version in your app manifest matches your build number.

To do this, you can install the [Manifest Versioning Build Tasks](https://marketplace.visualstudio.com/items?itemName=richardfennellBM.BM-VSTS-Versioning-Task) package. This package contains a task that can update your app manifest version. Once installed, you can use it like this:

```yaml
- task: VersionAPPX@2
  inputs:
    Path: '$(Build.SourcesDirectory)'
    VersionNumber: '$(Build.BuildNumber)'
    InjectVersion: False
    VersionRegex: '(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])(\.(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])){3}'
    OutputVersion: 'OutputedVersion'
```

I've included this step right before I trigger my MSBuild in my pipeline.

![](/wp-content/uploads/2020/12/version2.jpg)

Optionally, you can now again pass in the '$(Build.BuildNumber)' variable as 'buildVersion' parameter when sending my package to App Center. As App Center is able to retreive the version number from the Manifest, it is not needed, but you might choose to explicitly include it to safeguard your Manifest version is in sync with your build number. If they would'nt be in sync, your release won't show up in App Center.

If you should be interested, this is what my etire pipeline looks like:

```yaml
trigger:
- none

name: 1.1.$(date:yy)$(DayOfYear)$(rev:.r)

pool:
  vmImage: 'windows-latest'

variables:
- group: UWPBuild
- name: solution
  value: '**/*.sln'
- name: buildPlatform
  value: 'x86|x64'
- name: buildConfiguration
  value: 'Release'
- name: appxPackageDir
  value: '$(build.artifactStagingDirectory)\AppxPackages\\'

steps:
- task: NuGetToolInstaller@1

- task: NuGetCommand@2
  inputs:
    restoreSolution: '$(solution)'

- task: DownloadSecureFile@1
  name: mySecureFile
  displayName: 'Get the pfx file certificat'
  inputs:
    secureFile: '$(uwpSigningCert.secureFilePath)'

- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "Start adding the PFX file to the certificate store."

      $pfxpath = '$(mySecureFile.secureFilePath)'
      $password = '$(uwpSigningCert.password)'

      Write-Host $password
      
      Add-Type -AssemblyName System.Security
      $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
      $cert.Import($pfxpath, $password, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]"PersistKeySet")
      $store = new-object system.security.cryptography.X509Certificates.X509Store -argumentlist "MY", CurrentUser
      $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]"ReadWrite")
      $store.Add($cert)
      $store.Close()

- task: VersionAPPX@2
  inputs:
    Path: '$(Build.SourcesDirectory)'
    VersionNumber: '$(Build.BuildNumber)'
    InjectVersion: False
    VersionRegex: '(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])(\.(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])){3}'
    OutputVersion: 'OutputedVersion'

- task: VSBuild@1
  inputs:
    platform: 'x86'
    solution: '$(solution)'
    configuration: '$(buildConfiguration)'
    msbuildArgs: '/p:AppxBundlePlatforms="$(buildPlatform)" 
    /p:AppxPackageDir="$(appxPackageDir)" 
    /p:AppxBundle=Always 
    /p:UapAppxPackageBuildMode=StoreUpload
    /p:AppxPackageSigningEnabled=true
    /p:PackageCertificateThumbprint="$(uwpSigningCert.thumbprint)" 
    /p:PackageCertificateKeyFile="$(mySecureFile.secureFilePath)"
    /p:PackageCertificatePassword="$(uwpSigningCert.password)"'

- task: CopyFiles@2
  displayName: 'Copy Files to: $(build.artifactstagingdirectory)'
  inputs:
    SourceFolder: '$(system.defaultworkingdirectory)'
    Contents: '**\bin\$(BuildConfiguration)\**'
    TargetFolder: '$(build.artifactstagingdirectory)'

- task: PublishBuildArtifacts@1
  displayName: 'Publish Artifact: drop'
  inputs:
    PathtoPublish: '$(build.artifactstagingdirectory)'

- task: AppCenterDistribute@3
  inputs:
    serverEndpoint: 'AppCenterConnection'
    appSlug: '[*Redacted*]'
    appFile: '$(Build.ArtifactStagingDirectory)\AppxPackages\*\*.appxbundle'
    symbolsOption: 'UWP'
    releaseNotesOption: 'input'
    releaseNotesInput: 'New release'
    destinationType: 'groups'
    distributionGroupId: '$(appCenter.distributionGroupId)'
    buildVersion: '$(Build.BuildNumber)'
```
