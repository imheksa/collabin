#include "Subsystems/PlayerZeroSubsystem.h"
#include "glTFRuntimeFunctionLibrary.h"
#include "AvatarConfig.h"
#include "PlayerZero.h"
#include "PlayerZeroConfigProcessor.h"
#include "Api/AvatarCodes/AvatarCodeApi.h"
#include "Api/AvatarCodes/Models/AvatarCodeRequest.h"
#include "Api/AvatarCodes/Models/AvatarCodeResponse.h"
#include "Api/Characters/CharacterApi.h"
#include "Api/Characters/Models/CharacterFindByIdRequest.h"
#include "Api/Files/FileApi.h"
#include "Api/Files/Models/FileData.h"
#include "Api/GameEvents/GameEventApi.h"
#include "Api/GameEvents/Events/AvatarSessionEndedEvent.h"
#include "Api/GameEvents/Events/AvatarSessionHeartbeatEvent.h"
#include "Api/GameEvents/Events/AvatarSessionStartedEvent.h"
#include "Api/GameEvents/Events/GameMatchEndedEvent.h"
#include "Api/GameEvents/Events/GameMatchStartedEvent.h"
#include "Api/GameEvents/Events/GameSessionEndedEvent.h"
#include "Api/GameEvents/Events/GameSessionStartedEvent.h"
#include "Kismet/GameplayStatics.h"
#include "Settings/PlayerZeroDeveloperSettings.h"
#include "Utilities/PlayerZeroImageHelper.h"

constexpr const TCHAR* ConfigSection = TEXT("/Script/PlayerZero");
constexpr const TCHAR* CachedAvatarIdKey = TEXT("PZ_CACHED_AVATAR_ID");

void UPlayerZeroSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	FileApi = MakeShared<FFileApi>();
	CharacterApi = MakeShared<FCharacterApi>();
	GameEventApi = MakeShared<FGameEventApi>();
	AvatarCodeApi = MakeShared<FAvatarCodeApi>();
	LastPlayerActivity = FDateTime::UtcNow();
	PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	LoadCachedAvatarId(); 
	// TODO: Replace with real hot-loaded ID check
	if (true )
	{
		StartSessions();
	}
}

void UPlayerZeroSubsystem::Deinitialize()
{
	Super::Deinitialize();
	EndSessions();
	PlayerZeroSettings = nullptr;
	GetWorld()->GetTimerManager().ClearTimer(HeartbeatTimerHandle);
	HeartbeatActive = false;
}

void UPlayerZeroSubsystem::SaveCachedAvatarId(const FString& AvatarId)
{
	CachedAvatarId = AvatarId;

	GConfig->SetString(ConfigSection, CachedAvatarIdKey, *AvatarId, GGameIni);
	GConfig->Flush(false, GGameIni);
}

void UPlayerZeroSubsystem::LoadCachedAvatarId()
{
	if (FString AvatarIdFromConfig; GConfig->GetString(ConfigSection, CachedAvatarIdKey, AvatarIdFromConfig, GGameIni))
	{
		CachedAvatarId = AvatarIdFromConfig;
	}
	else
	{
		CachedAvatarId = PlayerZeroSettings->DefaultAvatarId;
	}
}

FString UPlayerZeroSubsystem::GetAvatarId()
{
	if (CachedAvatarId.IsEmpty())
	{
		CachedAvatarId = PlayerZeroSettings->DefaultAvatarId;
	}
	return CachedAvatarId;
}

void UPlayerZeroSubsystem::GetAvatarIconAsTexture(FString AvatarId, const FAvatarRenderConfig& Config, FOnAvatarTextureLoaded OnComplete)
{
	const FString Url = FString::Printf(TEXT("%s%s.png%s"), *AvatarsBaseUrl, *AvatarId,  *FPlayerZeroConfigProcessor::ProcessRender(Config));

	TWeakObjectPtr<UPlayerZeroSubsystem> WeakThis(this);
	FileApi->LoadFileFromUrl(Url, FOnAssetFileRequestComplete::CreateLambda(
	[WeakThis, OnComplete](const FFileData& File, const TArray<uint8>& Data)
	{
		if (!WeakThis.IsValid())
		{
			return;
		}
		if (UTexture2D* Texture = FPlayerZeroImageHelper::CreateTextureFromData(Data))
		{
			OnComplete.ExecuteIfBound(Texture);
			return; 
		}
		UE_LOG(LogPlayerZero, Error, TEXT("Failed to load icon from url: %s"), *File.Url);
		OnComplete.ExecuteIfBound(nullptr);
	}));
}

void UPlayerZeroSubsystem::GetAvatarMetaData(const FString& Id, FOnCharacterDataLoaded OnComplete)
{
	TSharedPtr<FCharacterFindByIdRequest> Request = MakeShared<FCharacterFindByIdRequest>();
	Request->Id = Id;
	TWeakObjectPtr<UPlayerZeroSubsystem> WeakThis(this);
	CharacterApi->FindByIdAsync(*Request, FOnCharacterFindResponse::CreateLambda(
		[WeakThis, OnComplete](FCharacterFindByIdResponse Response, bool bWasSuccessful)
		{
			if (!WeakThis.IsValid())
			{
				return;
			}
			if (bWasSuccessful)
			{
				OnComplete.ExecuteIfBound(Response.Data);
			}
			else
			{
				OnComplete.ExecuteIfBound(FPlayerZeroCharacter());
			}
		}));
}

void UPlayerZeroSubsystem::LoadAvatarAsset(const FString& AvatarId, const FAvatarConfig& Config, const FOnGltfAssetLoaded& OnComplete)
{
	TSharedPtr<FCharacterFindByIdRequest> Request = MakeShared<FCharacterFindByIdRequest>();
	Request->Id = AvatarId;
 	TWeakObjectPtr<UPlayerZeroSubsystem> WeakThis(this);
	CharacterApi->FindByIdAsync(*Request, FOnCharacterFindResponse::CreateLambda(
		[WeakThis, Config, AvatarId, OnComplete](FCharacterFindByIdResponse Response, bool bCharacterFetchSuccessful)
		{
			if (!WeakThis.IsValid())
			{
				return;
			}
			if (!bCharacterFetchSuccessful || Response.Data.Id.IsEmpty())
			{
				UE_LOG(LogPlayerZero, Error, TEXT("Failed to find character or ID was empty"));
				OnComplete.ExecuteIfBound(nullptr);
				return;
			}

			const FString GlbUrl = Response.Data.ModelUrl + FPlayerZeroConfigProcessor::ProcessCharacter(Config);
			if (GlbUrl.IsEmpty())
			{
				UE_LOG(LogPlayerZero, Error, TEXT("Character GLB URL is empty"));
				OnComplete.ExecuteIfBound(nullptr);
				return;
			}
			
			WeakThis->FileApi->LoadFileFromUrl(GlbUrl, FOnAssetFileRequestComplete::CreateLambda(
				[WeakThis, AvatarId, OnComplete](const FFileData& File, const TArray<uint8>& Data)
				{
					if (!WeakThis.IsValid())
					{
						return;
					}
					if (Data.Num() == 0)
					{
						UE_LOG(LogPlayerZero, Error, TEXT("Downloaded GLB data is empty"));
						OnComplete.ExecuteIfBound(nullptr);
						return;
					}
					// TODO remove if not needed
					//WeakThis->SaveCachedAvatarId(AvatarId); // Save the avatar ID for future use
					
					// Step 3: Load the GLTF asset
					FglTFRuntimeConfig Config;
					Config.TransformBaseType = EglTFRuntimeTransformBaseType::YForward;
					UglTFRuntimeAsset* GltfAsset = UglTFRuntimeFunctionLibrary::glTFLoadAssetFromData(Data, Config);
					
					if (!GltfAsset)
					{
						UE_LOG(LogPlayerZero, Error, TEXT("Failed to load GLTF asset from data"));
					}
					OnComplete.ExecuteIfBound(GltfAsset);
				}));
		}));
}

void UPlayerZeroSubsystem::GetAvatarFromAvatarCode(const FString& AvatarCode, FOnAvatarCodeLoaded OnComplete)
{
	TWeakObjectPtr<UPlayerZeroSubsystem> WeakThis(this);
	AvatarCodeApi->GetAvatarCode(AvatarCode, FOnAvatarCodeResponse::CreateLambda(
		[WeakThis, AvatarCode, OnComplete](const FAvatarCodeResponse& Response, bool bWasSuccessful)
		{
			if (!WeakThis.IsValid())
			{
				return;
			}
			if (bWasSuccessful && !Response.Data.AvatarId.IsEmpty())
			{
				OnComplete.ExecuteIfBound(Response.Data.AvatarId);
			}
			else
			{
				UE_LOG(LogPlayerZero, Error, TEXT("Failed to get avatar Id for AvatarCode: %s"), *AvatarCode);
				OnComplete.ExecuteIfBound(TEXT(""));
			}
		}));
}

void UPlayerZeroSubsystem::DownloadAvatarData(const FString& Url, const FAvatarConfig& Config, FOnAvatarDataDownloaded OnComplete)
{
	const FString ProcessedUrlParams = Url + FPlayerZeroConfigProcessor::ProcessCharacter(Config);
	TWeakObjectPtr<UPlayerZeroSubsystem> WeakThis(this);
	FileApi->LoadFileFromUrl(ProcessedUrlParams, FOnAssetFileRequestComplete::CreateLambda(
		[WeakThis, OnComplete](const FFileData& File, const TArray<uint8>& Data)
		{
			if (!WeakThis.IsValid())
			{
				return;
			}
			OnComplete.ExecuteIfBound(Data);
		}));
}


void UPlayerZeroSubsystem::LoadGltfAsset(const TArray<uint8>& Data, const FglTFRuntimeConfig& Config, FOnGltfAssetLoaded OnComplete)
{
	UglTFRuntimeAsset* Asset = nullptr;
	if (Data.Num() > 0)
	{
		Asset = UglTFRuntimeFunctionLibrary::glTFLoadAssetFromData(Data, Config);
	}
	else
	{
		UE_LOG(LogPlayerZero, Error, TEXT("GLTF data is empty."));
	}
	OnComplete.ExecuteIfBound(Asset);
}

void UPlayerZeroSubsystem::StartSessions()
{
	AvatarSessionId = GameSessionId = FGuid::NewGuid().ToString();
	GameSessionStart();
	AvatarSessionStart();
	StartHeartbeat();
}

void UPlayerZeroSubsystem::StartHeartbeat()
{
	if (!HeartbeatActive)
	{
		GetWorld()->GetTimerManager().SetTimer(HeartbeatTimerHandle, this, &UPlayerZeroSubsystem::SendHeartbeat, 60.f, true);
		HeartbeatActive = true;
	}
}

void UPlayerZeroSubsystem::SendHeartbeat()
{
	if (AvatarSessionId.IsEmpty())
		return;

	FAvatarSessionHeartbeatProperties Props;
	Props.SessionId = AvatarSessionId;
	Props.LastAvatarActivityAt = LastPlayerActivity.ToUnixTimestamp() * 1000;

	TGameEventWrapper<FAvatarSessionHeartbeatProperties> Event;
	Event.Event = TEXT("avatar_session_heartbeat");
	Event.Properties = Props;

	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("Heartbeat Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("Heartbeat Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::GameSessionStart()
{	
	FGameSessionStartedEventProperties Props;
	Props.SessionId = AvatarSessionId;
	Props.GameId = PlayerZeroSettings->GameId; 
	Props.AvatarId = CachedAvatarId;
	Props.ApplicationId = PlayerZeroSettings->ApplicationId; 
	Props.ProductName = FApp::GetProjectName();
	
	TGameEventWrapper<FGameSessionStartedEventProperties> Event;
	Event.Event = TEXT("user_game_session_started");
	Event.Properties = Props;
	
	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("GameSessionStart Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("GameSessionStart Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::GameSessionEnd()
{
	FGameSessionEndedEventProperties Props;
	Props.SessionId = AvatarSessionId;
	Props.GameId = PlayerZeroSettings->GameId;
	
	TGameEventWrapper<FGameSessionEndedEventProperties> Event;
	Event.Event = TEXT("user_game_session_ended");
	Event.Properties = Props;

	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("GameSessionEnd Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("GameSessionEnd Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::GameMatchStart()
{
	FGameMatchStartedEventProperties Props;
	Props.AvatarId = CachedAvatarId;
	Props.ApplicationId = PlayerZeroSettings->ApplicationId;
	Props.ProductName = FApp::GetProjectName(); // TODO Replace with actual product name
	Props.GameId = PlayerZeroSettings->GameId;
	Props.GameSessionId = GameSessionId;
	Props.SessionId = AvatarSessionId;
	// Props.StartContext = "StartContext"; // TODO Replace with actual start context
	// Props.LiveOpsId = "LiveOpsId"; // TODO Replace with actual LiveOps ID
	// Props.Tier = "Tier"; // TODO Replace with actual tier
	// Props.Round = 1; // TODO Replace with actual round number
	
	TGameEventWrapper<FGameMatchStartedEventProperties> Event;
	Event.Event = TEXT("user_game_match_started");
	Event.Properties = Props;

	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("GameSessionEnd Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("GameSessionEnd Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::GameMatchEnd()
{
   	FGameMatchEndedProperties Props;
	Props.GameId = PlayerZeroSettings->GameId;
	Props.SessionId = AvatarSessionId;
	Props.Score = 0;
	
	TGameEventWrapper<FGameMatchEndedProperties> Event;
	Event.Event = TEXT("user_game_session_ended");
	Event.Properties = Props;

	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("GameSessionEnd Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("GameSessionEnd Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::AvatarSessionStart()
{
	FAvatarSessionStartedProperties Props;
	Props.SessionId = AvatarSessionId;
	Props.GameId = PlayerZeroSettings->GameId;
	Props.AvatarId = CachedAvatarId; 
	Props.SdkVersion = TEXT("0.1.0");
	Props.SdkPlatform = TEXT("Unreal");
	TGameEventWrapper<FAvatarSessionStartedProperties> Event;
	Event.Event = TEXT("avatar_session_started");
	Event.Properties = Props;
	
	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("AvatarSessionStart Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("AvatarSessionStart Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::AvatarSessionEnd()
{
	FAvatarSessionEndedProperties Props;
	Props.SessionId = AvatarSessionId;
	Props.GameId = PlayerZeroSettings->GameId;
	
	TGameEventWrapper<FAvatarSessionEndedProperties> Event;
	Event.Event = TEXT("avatar_session_ended");
	Event.Properties = Props;

	
	GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
	{
		if (bSuccess)
		{
			UE_LOG(LogPlayerZero, Log, TEXT("AvatarSessionEnd Event sent"));
		}
		else
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("AvatarSessionEnd Event failed"));
		}
	}));
}

void UPlayerZeroSubsystem::EndSessions()
{
	if (!AvatarSessionId.IsEmpty())
	{
		FAvatarSessionEndedProperties Props;
		Props.SessionId = AvatarSessionId;
		Props.GameId = PlayerZeroSettings->GameId;

		TGameEventWrapper<FAvatarSessionEndedProperties> Event;
		Event.Event = TEXT("avatar_session_ended");
		Event.Properties = Props;

		GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
		{
			if ( bSuccess)
			{
				UE_LOG(LogPlayerZero, Log, TEXT("AvatarSessionEnded sent"));
			}
			else
			{
				UE_LOG(LogPlayerZero, Warning, TEXT("AvatarSessionEnded failed"));
			}
		}));
		AvatarSessionId.Empty();
	}

	if (!GameSessionId.IsEmpty())
	{
		FGameSessionEndedEventProperties Props;
		Props.SessionId = GameSessionId;
		Props.GameId = PlayerZeroSettings->GameId;
		
		TGameEventWrapper<FGameSessionEndedEventProperties> Event;
		Event.Event = TEXT("user_game_session_ended");
		Event.Properties = Props;

		GameEventApi = MakeShared<FGameEventApi>();
		GameEventApi->SendGameEventAsync(Event, FOnGameEventSent::CreateLambda([](bool bSuccess, const FString& Response)
		{
			if ( bSuccess)
			{
				UE_LOG(LogPlayerZero, Log, TEXT("GameSessionEnded sent"));
			}
			else
			{
				UE_LOG(LogPlayerZero, Warning, TEXT("GameSessionEnded failed"));
			}
		}));
		GameSessionId.Empty();
	}
}

bool UPlayerZeroSubsystem::DetectPlayerActivity()
{
	// Example legacy detection — expand with input system or polling
	if (APlayerController* PlayerController = UGameplayStatics::GetPlayerController(GetWorld(), 0))
	{
		FVector2D CurrentMousePosition;
		PlayerController->GetMousePosition(CurrentMousePosition.X, CurrentMousePosition.Y);

		if (CurrentMousePosition != LastMousePosition)
		{
			LastMousePosition = CurrentMousePosition;
			LastPlayerActivity = FDateTime::UtcNow();
			return true;
		}
	}
	return false;
}

void UPlayerZeroSubsystem::OnDeepLinkDataReceived(const FString& AvatarId)
{
	// TODO implement deep link handling logic
}
