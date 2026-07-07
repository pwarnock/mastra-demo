targetScope = 'resourceGroup'

@description('Name of the existing Azure AI Services / Foundry resource that will host the deployment.')
param accountName string = 'ai-foundry-platform-pw'

@description('Deployment name used by clients when they call the model.')
param deploymentName string = 'kimi-k2-6'

@description('Model name from your catalog. Default avoids deprecated Kimi-K2-Thinking.')
param modelName string = 'Kimi-K2.6'

@description('Catalog version for the selected model.')
param modelVersion string = '2026-04-20'

@allowed([
  'GlobalStandard'
])
@description('Deployment SKU name exposed for this model in the current catalog.')
param skuName string = 'GlobalStandard'

@minValue(1)
@description('Quota capacity to assign to the deployment. Set this to your available quota (20 in your current subscription).')
param capacity int = 20

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: accountName
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-04-01-preview' = {
  name: deploymentName
  parent: account
  sku: {
    name: skuName
    capacity: capacity
  }
  properties: {
    model: {
      format: 'MoonshotAI'
      name: modelName
      version: modelVersion
    }
  }
}

output deploymentResourceId string = deployment.id
output model string = deploymentName
output openAiCompatibleBaseUrl string = 'https://${accountName}.openai.azure.com/openai/v1/'
output foundryModelsBaseUrl string = 'https://${accountName}.services.ai.azure.com/models'
