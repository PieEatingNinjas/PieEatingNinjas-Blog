---
title: "Gotcha! Deploying Azure Notification Hub with ARM Template (APNS Token and Certificate)"
description: "While setting up Azure Notification Hubs with ARM templates, I encountered a nasty pitfall. I'm sharing it here hoping that it might help out other developers and for a future refe"
pubDate: "2020-01-29"
legacy: {"id":1589,"path":"/2020/01/29/gotcha-deploying-azure-notification-hub-with-arm-template-apns-token-and-certificate/","taxonomySlugs":{"categories":["arm","azure","notification-hubs","powershell"],"tags":[]}}
categories: ["arm","azure","notification-hubs","powershell"]
tags: []
---

While setting up Azure Notification Hubs with ARM templates, I encountered a nasty pitfall. I'm sharing it here hoping that it might help out other developers and for a future reference for myself as well. ;-)

I'll be sharing the Templates I used, the PowerShell code that uses these templates and some comments and remarks.

# TL;DR

When deploying a Azure Notification Hub for APNS through an ARM template, these are the correct endpoints to define:

-   For **Token** authentication mode set the **endpoint** to **https://api.push.apple.com:443/3/device** for **Production** and **https://api.development.push.apple.com:443/3/device** for **Sandbox**
-   For **Certificate** authentication mode, set the **endpoint** to **gateway.push.apple.com** for **Production** and **gateway.sandbox.push.apple.com** for **Sandbox**.

When using Certificate authentication mode, you should pass your certificate as a base64 encoded string:

```powershell
$certificate = "MyCert.p12" 
$certificateBytes = get-content 
$certificate -Encoding Byte 
$certificate = [System.Convert]::ToBase64String($certificateBytes)
```

# Notification Hub Namespace

## NotificationHubNamespaceTemplate.json

```powershell

```

This ARM template takes just one parameter: namespace\_name. The template sets up a basic Notification Hub namespace in West Europe in a Free Tier with the given namespace\_name as its name.

## PowerShell

```powershell
$resourceGroupName = "MyResourceGroup"

$hubNamespaceName = "MyNotificationHubNS"

New-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile ./NotificationHubNamespaceTemplate.json -namespaces_name $hubNamespaceName
```

This PS script calls New-AzResourceGroupDeployment, passing in the Resource Group name to which we want to deploy our Notification Hub. We pass in the path to our ARM template and provide a name for our Notification Hub Namespace.

# Notification Hub with Token Authentication Mode

## NotificationHubTemplate.json

```javascript
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "namespaces_name": {
            "type": "string"
        },
        "hub_name": {
            "type": "string"
        },
        "appId": {
            "type": "string"
        },
        "appName": {
            "type": "string"
        },
        "keyId": {
            "type": "string"
        },
        "token": {
            "type": "string"
        }
    },
    "variables": {},
    "resources": [
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'))]",
            "location": "West Europe",
            "properties": {
                "authorizationRules": [],
                "ApnsCredential": {
                "properties": {
                    "appId": "[parameters('appId')]",
                    "appName": "[parameters('appName')]",
                    "keyId": "[parameters('keyId')]",
                    "token": "[parameters('token')]",
                    "endpoint": "https://api.push.apple.com:443/3/device"
                  }
            }
            }
        },
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'), '/DefaultFullSharedAccessSignature')]",
            "dependsOn": [
                "[resourceId('Microsoft.NotificationHubs/namespaces/notificationHubs', parameters('namespaces_name'), parameters('hub_name'))]",
            ],
            "properties": {
                "rights": [
                    "Listen",
                    "Manage",
                    "Send"
                ]
            }
        },
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'), '/DefaultListenSharedAccessSignature')]",
            "dependsOn": [
                "[resourceId('Microsoft.NotificationHubs/namespaces/notificationHubs', parameters('namespaces_name'), parameters('hub_name'))]",
            ],
            "properties": {
                "rights": [
                    "Listen"
                ]
            }
        }
    ]
}
```

This template creates a Notification Hub inside an existing Notification Hub Namespace. I think the 5 parameters (namespaces\_name, appId, appName, keyId, token) speak for themselves.

If you've already set-up a Notification Hub through the Azure Portal, the parameters of this template might look familiar:

![NotificationHubTokenConfig](/wp-content/uploads/2020/01/NotificationHubTokenConfig.jpg)

Comparing the parameters in the Azure portal with those in the ARM template, there is one little oddity: the **Application** **Mode**. This setting in the portal depends on the APNS endpoint, it's this endpoint that defines the environment: Production or Sandbox (this must also match the aps-environment entitlement of the app).

In order to set your Application Mode to **Production**, you must set **https://api.push.apple.com:443/3/device** as endpoint. If you want to set your Application Mode to **Sandbox**, you must set **https://api.development.push.apple.com:443/3/device** as endpoint.

## PowerShell

```powershell
$resourceGroupName = "MyResourceGroup"
$hubNamespaceName = "MyNotificationHubNS"

$appId =  "3PXXXXXXXX"
$appName = "be.mycompany.myapp"
$keyId = "X5XXXXXXXX"
$token = "MIGT..."

New-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile ./NotificationHubTemplate.json -namespaces_name $hubNamespaceName -hub_name $hubName -appId $appId -appName $appName -keyId $keyId -token $token
```

This PS script calls New-AzResourceGroupDeployment, passing in the Resource Group name to which we want to deploy our Notification Hub. We pass in the name of the existing NotificationHubNamespace under which we want to create this hub. Finally we also pass all the parameters (appId, appName, keyId, token) to correctly configure the credentials for APNS.

# Notification Hub with Certificate Authentication Mode

## NotificationHubCertTemplate.json

```javascript
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "namespaces_name": {
            "type": "string"
        },
        "hub_name": {
            "type": "string"
        },
        "certificate": {
            "type": "string"
        },
        "certificateKey": {
            "type": "string"
        }
    },
    "variables": {},
    "resources": [
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'))]",
            "location": "West Europe",
            "properties": {
              "authorizationRules": [],
              "ApnsCredential": {
                "properties": {
                  "apnsCertificate": "[parameters('certificate')]",
                  "certificateKey": "[parameters('certificateKey')]",
                  "endpoint": "gateway.push.apple.com"
                }
              }
            }
        },
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'), '/DefaultFullSharedAccessSignature')]",
            "dependsOn": [
                "[resourceId('Microsoft.NotificationHubs/namespaces/notificationHubs', parameters('namespaces_name'), parameters('hub_name'))]",
            ],
            "properties": {
                "rights": [
                    "Listen",
                    "Manage",
                    "Send"
                ]
            }
        },
        {
            "type": "Microsoft.NotificationHubs/namespaces/notificationHubs/authorizationRules",
            "apiVersion": "2017-04-01",
            "name": "[concat(parameters('namespaces_name'), '/', parameters('hub_name'), '/DefaultListenSharedAccessSignature')]",
            "dependsOn": [
                "[resourceId('Microsoft.NotificationHubs/namespaces/notificationHubs', parameters('namespaces_name'), parameters('hub_name'))]",
            ],
            "properties": {
                "rights": [
                    "Listen"
                ]
            }
        }
    ]
}
```

This template creates a Notification Hub inside an existing Notification Hub Namespace. I think the 4 parameters (namespaces\_name, hub\_name, certificate, certificatekey) don't need much explanation. One important note is the fact that the certificate needs to be passed as a base64 encoded string. In the script below, I'll show how you can do this in PowerShell. One other remarkable thing here is, again, the endpoint. Just like with the previous template (for token based authentication), the endpoint determines the Application Mode (which, again, should match the aps-environment entitlement of the app).

However, when working with certificates, we need to use an other url than the one we used for token based authentication. In order to set your Application Mode to **Production**, you must set **gateway.push.apple.com** as endpoint. If you want to set your Application Mode to **Sandbox** you must set **gateway.sandbox.push.apple.com** as endpoint.

I had been struggling some time to get the Certificate based Hub up and running, as I was always using the https://api.push.apple.com:443/3/device endpoint. The script wouldn't fail or anything, but sending out notifications would fail on this Hub.

But then, looking more closely in the Azure portal gave me a hint:

![NotificationHubCertConfig](/wp-content/uploads/2020/01/NotificationHubCertConfig.jpg)

See how the Application Mode toggle doesn't seem to know if we're in Production or Sandbox mode? This made me think that there must be something wrong with the endpoint. After searching around a bit, trying out some stuff, I found that the endpoint for certificate based authentication should be the _gateway_ urls and not the _api.push_ ones.

## PowerShell

```powershell
$resourceGroupName = "MyResourceGroup"
$hubNamespaceName = "MyNotificationHubNS"
$hubName = "MyCertHub"
$certKey = "mykey"

$certificate = "MyCert.p12" 
$certificateBytes = get-content $certificate -Encoding Byte 
$certificate = [System.Convert]::ToBase64String($certificateBytes)

New-AzResourceGroupDeployment -ResourceGroupName $resourceGroupName -TemplateFile ./NotificationHubCertTemplate.json -namespaces_name $hubNamespaceName -hub_name $hubName -certificate $certificate -certificateKey $certKey
```

Just as before, we are setting some variables and we call New-AzResourceGroupDeployment, passing in a resource group name, our template and the rest of our parameters.

As already stated before, the certificate should be passed as a base64 encoded string, as you can see in the above script.

# Conclusion

I Had to search a bit to get everything up and running. Now that I have everything configured correctly it is super easy and doesn't seem to be complex at all. I do think it's a shame that there doesn't seem to be any good documentation around setting up Azure Notification Hubs with ARM templates and the different parameters/options to choose from. I hope this blogpost can be of any value to somebody who's struggling with it as well.
