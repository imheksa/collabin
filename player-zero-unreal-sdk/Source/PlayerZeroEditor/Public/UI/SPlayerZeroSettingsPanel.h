#pragma once

#include "CoreMinimal.h"
#include "Api/Blueprints/Models/CharacterBlueprint.h"
#include "DeveloperAccounts/Models/ApplicationListResponse.h"
#include "Widgets/SCompoundWidget.h"

struct FBlueprintListResponse;
class FPlayerZeroTextureLoader;
class FBlueprintApi;
class FDeveloperAccountApi;
struct FOrganizationListResponse;
struct FApplicationListResponse;
class FEditorAssetLoader;
class FRpmTextureLoader;
struct FRpmAsset;
class FAssetApi;
struct FAssetListResponse;

DECLARE_DELEGATE(FOnLogout);

class PLAYERZEROEDITOR_API SPlayerZeroSettingsPanel: public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SPlayerZeroSettingsPanel) {}
	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs);
	void RunPanelSetup(const FString& InUserName);


	FOnLogout OnLogout;
private:
	TSharedPtr<FDeveloperAccountApi> DeveloperAccountApi;
	TSharedPtr<FBlueprintApi> BlueprintApi;
	
	TSharedPtr<STextBlock> ErrorMessageText;
	TSharedPtr<SVerticalBox> ContentBox;
	TSharedPtr<FString> SelectedComboBoxItem;
	TArray<TSharedPtr<FString>> ComboBoxItems;
	TSharedPtr<STextBlock> SelectedApplicationTextBlock;
	TArray<UTexture2D*> CharacterStyleTextures;
	TArray<FPlayerZeroApplication> ApplicationList;
	TMap<FString, FCharacterBlueprint> LoadedBlueprints;
	TArray<TSharedPtr<FPlayerZeroTextureLoader>> ActiveLoaders;
	FString UserName;

	void LoadBlueprintList();
	void UpdateErrorMessage(const FString& Message);
	void PopulateSettingsContent(TArray<FPlayerZeroApplication> InApplicationList);
	void SetApplicationIdFromEditorTool(const FString& NewApplicationId);
	void OnTextureLoaded(UTexture2D* Texture2D, TSharedPtr<SImage> Image, TSharedPtr<FPlayerZeroTextureLoader> RpmTextureLoader);
	void AddCharacterBlueprint(const FCharacterBlueprint& CharacterBlueprint);
	void HandleBlueprintListResponse(const FBlueprintListResponse& Response, bool bWasSuccessful);
	void HandleApplicationListResponse(const FApplicationListResponse& Response, bool bWasSuccessful);
	void HandleOrganizationListResponse(const FOrganizationListResponse& Response, bool bWasSuccessful);
	void OnComboBoxSelectionChanged(TSharedPtr<FString> NewValue, ESelectInfo::Type SelectInfo);
	void ClearLoadedCharacterModelImages();
	FReply OnLogoutClicked();
	void PopulateComboBoxItems(const TArray<FString>& Items, const FString ActiveItem);
	FText GetSelectedComboBoxItemText() const;
	FText GetWelcomeText() const;


};
