#include "UI/SPlayerZeroSettingsPanel.h"

#include "PlayerZeroEditor.h"
#include "PlayerZeroTextureLoader.h"
#include "Api/Blueprints/BlueprintApi.h"
#include "Api/Blueprints/Models/BlueprintListRequest.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Auth/DevAuthTokenCache.h"
#include "Auth/Models/DeveloperAuth.h"
#include "DeveloperAccounts/DeveloperAccountApi.h"
#include "DeveloperAccounts/Models/ApplicationListRequest.h"
#include "DeveloperAccounts/Models/ApplicationListResponse.h"
#include "DeveloperAccounts/Models/OrganizationListRequest.h"
#include "DeveloperAccounts/Models/OrganizationListResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"
#include "Utilities/PlayerZeroImageHelper.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SComboBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Images/SImage.h"

void SPlayerZeroSettingsPanel::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SNew(SVerticalBox)
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(SHorizontalBox)
			+ SHorizontalBox::Slot()
			.FillWidth(1.0)
			[
				SNew(STextBlock)
				.Text(this, &SPlayerZeroSettingsPanel::GetWelcomeText)
				
			]
			+ SHorizontalBox::Slot()
			  .AutoWidth()
			  .HAlign(HAlign_Right)
			[
				SNew(SButton)
				.Text(FText::FromString("Logout"))
				.OnClicked(this, &SPlayerZeroSettingsPanel::OnLogoutClicked)
			]
		]
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(STextBlock)
			.Text(FText::FromString("Project Settings"))
			.Font(FSlateFontInfo(FPaths::EngineContentDir() / TEXT("Slate/Fonts/Roboto-Regular.ttf"), 16))
		]
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(STextBlock)
			.Text(FText::FromString("Select the Player Zero application to link to project"))
		]

		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(SComboBox<TSharedPtr<FString>>)
			.OptionsSource(&ComboBoxItems)
			.OnSelectionChanged(this, &SPlayerZeroSettingsPanel::OnComboBoxSelectionChanged)
			.OnGenerateWidget_Lambda([](TSharedPtr<FString> Item)
				{
				return SNew(STextBlock).Text(FText::FromString(*Item));
				})
			[
				SAssignNew(SelectedApplicationTextBlock, STextBlock).Text(
					this, &SPlayerZeroSettingsPanel::GetSelectedComboBoxItemText)
			]
		]
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(STextBlock)
			.Text(FText::FromString("Character Blueprints"))
			.Font(FSlateFontInfo(FPaths::EngineContentDir() / TEXT("Slate/Fonts/Roboto-Regular.ttf"), 16))
		]
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .AutoHeight()
		[
			SNew(STextBlock)
			.Text(FText::FromString("Here you can import your character blueprints from Studio"))
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10)
		[
			SAssignNew(ErrorMessageText, STextBlock)
			.ColorAndOpacity(FSlateColor(FLinearColor::Red))
			.Visibility(EVisibility::Collapsed) // Hidden initially
		]
		+ SVerticalBox::Slot()
		  .Padding(10)
		  .FillHeight(1.0f) // Allows the scroll box to take up remaining space
		[
			SNew(SScrollBox)
			+ SScrollBox::Slot()
			[
				SAssignNew(ContentBox, SVerticalBox)
			]
		]	
	];

	UpdateErrorMessage("");
}

void SPlayerZeroSettingsPanel::RunPanelSetup(const FString& InUserName)
{
	LoadedBlueprints = TMap<FString, FCharacterBlueprint>();
	ActiveLoaders = TArray<TSharedPtr<FPlayerZeroTextureLoader>>();
	
	InUserName.IsEmpty() ? UserName = TEXT("User") : UserName = InUserName;
	UpdateErrorMessage("");
	const FDeveloperAuth DevAuthData = FDevAuthTokenCache::GetAuthData();


	if(!DeveloperAccountApi.IsValid())
	{
		DeveloperAccountApi = MakeShared<FDeveloperAccountApi>();
		DeveloperAccountApi->OnApplicationListResponse.BindRaw(this, &SPlayerZeroSettingsPanel::HandleApplicationListResponse);
		DeveloperAccountApi->OnOrganizationResponse.BindRaw(this, &SPlayerZeroSettingsPanel::HandleOrganizationListResponse);
	}

	if (!BlueprintApi.IsValid())
	{
		BlueprintApi = MakeShared<FBlueprintApi>();
	}
	DeveloperAccountApi->ListOrganizationsAsync(FOrganizationListRequest());
}

void SPlayerZeroSettingsPanel::UpdateErrorMessage(const FString& Message)
{
	if (Message.IsEmpty())
	{
		ErrorMessageText->SetVisibility(EVisibility::Collapsed);
	}
	else
	{
		ErrorMessageText->SetText(FText::FromString(Message));
		ErrorMessageText->SetVisibility(EVisibility::Visible);
	}
}

void SPlayerZeroSettingsPanel::PopulateSettingsContent(TArray<FPlayerZeroApplication> InApplicationList)
{

	if(InApplicationList.Num() == 0)
	{
		UE_LOG( LogPlayerZeroEditor, Error, TEXT("No applications found, check your Player Zero Settings") );
		return;
	}
	const FDeveloperAuth DevAuthData = FDevAuthTokenCache::GetAuthData();
	const UPlayerZeroDeveloperSettings* RpmSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	ApplicationList = InApplicationList;
	FString Active;
	TArray<FString> Items;
	for (const FPlayerZeroApplication& App : ApplicationList)
	{
		Items.Add(App.Name);

		if (RpmSettings->ApplicationId.IsEmpty())
		{
			SetApplicationIdFromEditorTool(App.Id);
			Active = App.Name;
		}
	}
	if (Active.IsEmpty() && Items.Num() > 0)
	{
		const auto NewActiveItem = MakeShared<FString>(Items[0]);
		OnComboBoxSelectionChanged(NewActiveItem, ESelectInfo::Direct);
		SelectedApplicationTextBlock->SetText(FText::FromString(*NewActiveItem));
	}
	PopulateComboBoxItems(Items, Active);
	LoadBlueprintList();
}

void SPlayerZeroSettingsPanel::SetApplicationIdFromEditorTool(const FString& NewApplicationId)
{
	// Get settings object
	UPlayerZeroDeveloperSettings* Settings = GetMutableDefault<UPlayerZeroDeveloperSettings>();
	if (Settings)
	{
		Settings->ApplicationId = NewApplicationId;

		// Mark dirty so it's saved
		Settings->SaveConfig();

		// Optional: for editor to immediately reflect changes
#if WITH_EDITOR
		Settings->TryUpdateDefaultConfigFile();
#endif

		UE_LOG(LogPlayerZeroEditor, Log, TEXT("PlayerZero: ApplicationId was set to %s"), *NewApplicationId);
	}
}

void SPlayerZeroSettingsPanel::LoadBlueprintList()
{
	if (!BlueprintApi.IsValid())
	{
		return;
	}
	const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetMutableDefault<UPlayerZeroDeveloperSettings>();
	const FBlueprintListRequest Request = FBlueprintListRequest(PlayerZeroSettings->ApplicationId, false);
	BlueprintApi->ListAsync(Request, FBlueprintApiListResponse::CreateRaw(this, &SPlayerZeroSettingsPanel::HandleBlueprintListResponse));
}


void SPlayerZeroSettingsPanel::AddCharacterBlueprint(const FCharacterBlueprint& CharacterBlueprint)
{
	TSharedPtr<SImage> ImageWidget;
	const FVector2D ImageSize(100.0f, 100.0f);

	ContentBox->AddSlot()
			  .AutoHeight()
			  .Padding(5)
	[
		SNew(SHorizontalBox)
		+ SHorizontalBox::Slot()
		  .AutoWidth()
		  .Padding(5)
		[
			SNew(SVerticalBox)
			+ SVerticalBox::Slot()
			  .AutoHeight()
			  .HAlign(HAlign_Left)
			[
				SAssignNew(ImageWidget, SImage).
				DesiredSizeOverride(ImageSize)
			]
		]
		+ SHorizontalBox::Slot()
		  .AutoWidth()
		  .VAlign(VAlign_Top)
		  .Padding(10, 10, 0, 0)
		[
			SNew(SVerticalBox)
				+ SVerticalBox::Slot()
				  .AutoHeight()
				  .HAlign(HAlign_Left)
			[
				SNew(SEditableText)
				   .Text(FText::FromString(FString::Printf(TEXT("Name: %s"), *CharacterBlueprint.Name)))
				   .IsReadOnly(true)
				   .IsCaretMovedWhenGainFocus(false)
				   .SelectAllTextWhenFocused(false)
				   .MinDesiredWidth(100.0f)
			]
			+ SVerticalBox::Slot()
				  .AutoHeight()
				  .HAlign(HAlign_Left)
			[
				SNew(SEditableText)
				   .Text(FText::FromString(FString::Printf(TEXT("ID: %s"), *CharacterBlueprint.Id)))
				   .IsReadOnly(true)
				   .IsCaretMovedWhenGainFocus(false)
				   .SelectAllTextWhenFocused(false)
				   .MinDesiredWidth(100.0f)
			]
		]

		
	];

	TSharedPtr<FPlayerZeroTextureLoader> ImageLoader = MakeShared<FPlayerZeroTextureLoader>();
	ActiveLoaders.Add(ImageLoader);
	ImageLoader->OnTextureLoaded.BindRaw(this, &SPlayerZeroSettingsPanel::OnTextureLoaded, ImageWidget, ImageLoader);
	ImageLoader->LoadIconFromUrl(CharacterBlueprint.CharacterModel.IconUrl);
}

void SPlayerZeroSettingsPanel::OnTextureLoaded(UTexture2D* Texture2D, TSharedPtr<SImage> Image, TSharedPtr<FPlayerZeroTextureLoader> RpmTextureLoader)
{
	if (Texture2D)
	{
		Texture2D->AddToRoot();
		CharacterStyleTextures.Add(Texture2D);
		FPlayerZeroImageHelper::LoadTextureToSImage(Texture2D, FVector2D(100.0f, 100.0f), Image);
	}
	ActiveLoaders.Remove(RpmTextureLoader);
}

void SPlayerZeroSettingsPanel::HandleBlueprintListResponse(const FBlueprintListResponse& Response, bool bWasSuccessful)
{
	LoadedBlueprints.Empty();
	if(bWasSuccessful)
	{
		UE_LOG(LogPlayerZeroEditor, Log, TEXT("Blueprint LIST request completed."));
		if(Response.Data.Num() == 0)
		{
			UE_LOG(LogPlayerZeroEditor, Error, TEXT("No Avatar styles found. Make sure you have created character blueprints in your Player Zero application"));
			UpdateErrorMessage("No Avatar styles found. Make sure you have uploaded your character models to Player Zero");
			return;
		}
		UE_LOG(LogPlayerZeroEditor, Log, TEXT("Blueprints listed successfully. Count: %d"), Response.Data.Num());
		for (FCharacterBlueprint CharacterBlueprint : Response.Data)
		{
			if (LoadedBlueprints .Contains(CharacterBlueprint.Id))
			{
				continue;
			}
			LoadedBlueprints.Add(CharacterBlueprint.Id, CharacterBlueprint);
			AddCharacterBlueprint(CharacterBlueprint);
		}
		UpdateErrorMessage("");
		return;
	}
	UE_LOG(LogPlayerZeroEditor, Error, TEXT("Failed to list base models"));
	UpdateErrorMessage("Failed to load base models. Please try again.");
}

void SPlayerZeroSettingsPanel::HandleOrganizationListResponse(const FOrganizationListResponse& Response, bool bWasSuccessful)
{
	if (bWasSuccessful)
	{
		// log success
		if (Response.Data.Num() == 0)
		{
			UE_LOG(LogPlayerZeroEditor, Error, TEXT("No organizations found"));
			return;
		}
		UE_LOG(LogPlayerZeroEditor, Log, TEXT("Organizations listed successfully. Count: %d"), Response.Data.Num());
		FApplicationListRequest Request;
		Request.Params.Add("organizationId", Response.Data[0].Id);
		DeveloperAccountApi->ListApplicationsAsync(Request);
		return;
	}

	UE_LOG(LogPlayerZeroEditor, Error, TEXT("Failed to list organizations"));
}

void SPlayerZeroSettingsPanel::HandleApplicationListResponse(const FApplicationListResponse& Response, bool bWasSuccessful)
{
	if (bWasSuccessful)
	{
		// log success
		UE_LOG(LogPlayerZeroEditor, Log, TEXT("Applications listed successfully. Count: %d"), Response.Data.Num());

		PopulateSettingsContent(Response.Data);
	}
	else
	{
		UE_LOG(LogPlayerZeroEditor, Error, TEXT("Failed to list applications"));
	}
}

void SPlayerZeroSettingsPanel::PopulateComboBoxItems(const TArray<FString>& Items, const FString ActiveItem)
{
	ComboBoxItems.Empty();
	for (const FString& Item : Items)
	{
		ComboBoxItems.Add(MakeShared<FString>(Item));
	}
	SelectedComboBoxItem = MakeShared<FString>(ActiveItem);
}

FText SPlayerZeroSettingsPanel::GetSelectedComboBoxItemText() const
{
	return SelectedComboBoxItem.IsValid() && !SelectedComboBoxItem->IsEmpty()
			   ? FText::FromString(*SelectedComboBoxItem)
			   : FText::FromString("Select an option");
}

FText SPlayerZeroSettingsPanel::GetWelcomeText() const
{
	return FText::Format(FText::FromString("Welcome {0}"), FText::FromString(UserName));
}

void SPlayerZeroSettingsPanel::OnComboBoxSelectionChanged(TSharedPtr<FString> NewValue, ESelectInfo::Type SelectInfo)
{
	SelectedComboBoxItem = NewValue;
	FPlayerZeroApplication* Application = ApplicationList.FindByPredicate([&](const FPlayerZeroApplication& Item)
	{
		return Item.Name == *NewValue;
	});
	if (Application)
	{
		SetApplicationIdFromEditorTool(Application->Id);
	}
}

FReply SPlayerZeroSettingsPanel::OnLogoutClicked()
{
	if (ContentBox.IsValid())
	{
		ContentBox->ClearChildren();
	}
	ComboBoxItems.Empty();

	ClearLoadedCharacterModelImages();
	FDevAuthTokenCache::ClearAuthData();
	OnLogout.ExecuteIfBound();
	return FReply::Handled();
}

void SPlayerZeroSettingsPanel::ClearLoadedCharacterModelImages()
{
	for (const auto Texture : CharacterStyleTextures)
	{
		Texture->RemoveFromRoot();
	}
	CharacterStyleTextures.Empty();
}
