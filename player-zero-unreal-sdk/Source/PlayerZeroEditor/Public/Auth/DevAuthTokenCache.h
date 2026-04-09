#pragma once

#include "CoreMinimal.h"

struct FDeveloperAuth;

class PLAYERZEROEDITOR_API FDevAuthTokenCache
{
public:
	static FDeveloperAuth GetAuthData();
	static void SetAuthData(const FDeveloperAuth& DevAuthData);
	static void ClearAuthData();
private:
	static FDeveloperAuth AuthData;
	
	static constexpr const TCHAR* CacheKeyName = TEXT("Name");
	static constexpr const TCHAR* CacheKeyToken = TEXT("Token");
	static constexpr const TCHAR* CacheKeyRefreshToken = TEXT("RefreshToken");
	

	static bool bIsInitialized;
	static void Initialize();
};
