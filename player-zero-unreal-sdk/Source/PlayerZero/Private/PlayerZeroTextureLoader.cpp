#include "PlayerZeroTextureLoader.h"
#include "PlayerZero.h"
#include "Api/Files/FileApi.h"
#include "Api/Files/Models/FileData.h"
#include "Async/Async.h"
#include "Modules/ModuleManager.h"
#include "Engine/Texture2D.h"
#include "Utilities/PlayerZeroImageHelper.h"

FPlayerZeroTextureLoader::FPlayerZeroTextureLoader()
{
	FileApi = MakeShared<FFileApi>();
}

void FPlayerZeroTextureLoader::LoadIconFromUrl(const FString& Url)
{
	FileApi->LoadFileFromUrl(Url, FOnAssetFileRequestComplete::CreateRaw(this, &FPlayerZeroTextureLoader::OnIconLoaded));
}

void FPlayerZeroTextureLoader::OnIconLoaded(const FFileData& File, const TArray<unsigned char>& Data)
{
	if (UTexture2D* Texture = FPlayerZeroImageHelper::CreateTextureFromData(Data))
	{
		OnTextureLoaded.ExecuteIfBound(Texture);
		return;
	}
	UE_LOG(LogPlayerZero, Error, TEXT("Failed to load icon for asset: %s"), *File.Name);
	OnTextureLoaded.ExecuteIfBound(nullptr);
}
