#include "Auth/DevAuthTokenCache.h"
#include "EditorCache.h"
#include "Auth/Models/DeveloperAuth.h"
#include "Misc/ConfigCacheIni.h"

FDeveloperAuth FDevAuthTokenCache::AuthData = FDeveloperAuth();
bool FDevAuthTokenCache::bIsInitialized = false;

void FDevAuthTokenCache::Initialize()
{
	if (!bIsInitialized)
	{
		AuthData.Name = FEditorCache::GetString(CacheKeyName, FString());
		AuthData.Token = FEditorCache::GetString(CacheKeyToken, FString());
		AuthData.RefreshToken = FEditorCache::GetString(CacheKeyRefreshToken, FString());

		if (!AuthData.IsValid())
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("DevAuthTokenCache: Invalid AuthData %s"), *AuthData.ToJsonString());
			ClearAuthData();
		}

		bIsInitialized = true;
	}
}

FDeveloperAuth FDevAuthTokenCache::GetAuthData()
{
	Initialize();	
	return AuthData;
}

void FDevAuthTokenCache::SetAuthData(const FDeveloperAuth& DevAuthData)
{
	AuthData = DevAuthData;
	FEditorCache::SetString( CacheKeyName, AuthData.Name);
	FEditorCache::SetString( CacheKeyToken, AuthData.Token);
	FEditorCache::SetString( CacheKeyRefreshToken, AuthData.RefreshToken);
}

void FDevAuthTokenCache::ClearAuthData()
{
	AuthData = FDeveloperAuth();
	FEditorCache::RemoveKey(CacheKeyName);
	FEditorCache::RemoveKey(CacheKeyToken);
	FEditorCache::RemoveKey(CacheKeyRefreshToken);
}
