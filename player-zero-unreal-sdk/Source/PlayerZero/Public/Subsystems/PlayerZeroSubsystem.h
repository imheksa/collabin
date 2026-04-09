#pragma once

#include "glTFRuntimeAsset.h"
#include "PlayerZeroCharacterTypes.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "PlayerZeroSubsystem.generated.h"

class UPlayerZeroDeveloperSettings;
class FAvatarCodeApi;
class FFileApi;
class FCharacterApi;
class FGameEventApi;

struct FAvatarRenderConfig;
struct FAvatarConfig;
struct FglTFRuntimeConfig;
struct FPlayerZeroCharacter;
struct FFileData;
struct FCharacterFindByIdResponse;

DECLARE_DELEGATE_OneParam(FOnCharacterDataLoaded, const FPlayerZeroCharacter&);
DECLARE_DELEGATE_OneParam(FOnAvatarDataDownloaded, const TArray<uint8>&);
DECLARE_DELEGATE_OneParam(FOnGltfAssetLoaded, UglTFRuntimeAsset*);
DECLARE_DELEGATE_OneParam(FOnAvatarTextureLoaded, UTexture2D*);
DECLARE_DELEGATE_OneParam(FOnAvatarCodeLoaded, const FString&);

UCLASS()
class PLAYERZERO_API UPlayerZeroSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	void SaveCachedAvatarId(const FString& AvatarId);
	void LoadCachedAvatarId();
	
	FString GetAvatarId();
	
	void GetAvatarIconAsTexture(FString AvatarId, const FAvatarRenderConfig& Config, FOnAvatarTextureLoaded OnComplete);
	void GetAvatarMetaData(const FString& Id, FOnCharacterDataLoaded OnComplete);
	void DownloadAvatarData(const FString& Url, const FAvatarConfig& Config, FOnAvatarDataDownloaded OnComplete);
	void LoadGltfAsset(const TArray<uint8>& Data, const FglTFRuntimeConfig& Config, FOnGltfAssetLoaded OnComplete);
	void LoadAvatarAsset(const FString& AvatarId, const FAvatarConfig& Config, const FOnGltfAssetLoaded& OnComplete);
	void GetAvatarFromAvatarCode(const FString& AvatarCode, FOnAvatarCodeLoaded OnComplete);
	
	void StartSessions();
	void StartHeartbeat();
	void GameSessionStart();
	void GameSessionEnd();
	void GameMatchStart();
	void GameMatchEnd();
	void AvatarSessionStart();
	void AvatarSessionEnd();
	void EndSessions();

private:

	const UPlayerZeroDeveloperSettings* PlayerZeroSettings;
	const FString AvatarsBaseUrl = TEXT("https://avatars.readyplayer.me/");
	FTimerHandle HeartbeatTimerHandle;
	FDateTime LastPlayerActivity;
	FVector2D LastMousePosition;
	FString AvatarSessionId;
	FString GameSessionId;
	bool HeartbeatActive = false;
	
	void SendHeartbeat();
	bool DetectPlayerActivity();

	UPROPERTY()
	FString CachedCharacterUrl;
	
	bool bIsInitialized = false;
	FString CachedAvatarId;

	TSharedPtr<FCharacterApi> CharacterApi;
	TSharedPtr<FFileApi> FileApi;
	TSharedPtr<FGameEventApi> GameEventApi;
	TSharedPtr<FAvatarCodeApi> AvatarCodeApi;

	void OnDeepLinkDataReceived(const FString& AvatarId);
	
};

