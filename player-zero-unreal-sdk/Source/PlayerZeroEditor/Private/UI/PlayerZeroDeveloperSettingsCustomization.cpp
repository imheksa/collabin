#include "UI/PlayerZeroDeveloperSettingsCustomization.h"
#include "DetailLayoutBuilder.h"
#include "DetailCategoryBuilder.h"
#include "DetailWidgetRow.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SSeparator.h"
#include "PropertyCustomizationHelpers.h"
#include "Settings/PlayerZeroDeveloperSettings.h"

#define LOCTEXT_NAMESPACE "PlayerZeroDeveloperSettingsCustomization"

TSharedRef<IDetailCustomization> FPlayerZeroDeveloperSettingsCustomization::MakeInstance()
{
	return MakeShareable(new FPlayerZeroDeveloperSettingsCustomization);
}

void FPlayerZeroDeveloperSettingsCustomization::CustomizeDetails(IDetailLayoutBuilder& DetailBuilder)
{
	// Get the settings object
	TArray<TWeakObjectPtr<UObject>> Objects;
	DetailBuilder.GetObjectsBeingCustomized(Objects);

	if (Objects.Num() == 0)
	{
		return;
	}

	const UPlayerZeroDeveloperSettings* Settings = Cast<UPlayerZeroDeveloperSettings>(Objects[0].Get());
	if (!Settings)
	{
		return;
	}

	IDetailCategoryBuilder& Category = DetailBuilder.EditCategory("Player Zero Settings");

	// ApplicationId
	TSharedRef<IPropertyHandle> AppIdHandle = DetailBuilder.GetProperty(GET_MEMBER_NAME_CHECKED(UPlayerZeroDeveloperSettings, ApplicationId));
	AppIdHandle->MarkHiddenByCustomization();

	Category.AddProperty(AppIdHandle)
	.CustomWidget()
	.NameContent()
	[
		AppIdHandle->CreatePropertyNameWidget()
	]
	.ValueContent()
	.MinDesiredWidth(300)
	[
		SNew(SVerticalBox)

		+ SVerticalBox::Slot()
		.AutoHeight()
		[
			AppIdHandle->CreatePropertyValueWidget()
		]

		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(0, 2)
		[
			SNew(STextBlock)
			.Text(LOCTEXT("AppIdMissing", "ApplicationId is required"))
			.Visibility_Lambda([AppIdHandle]() -> EVisibility
			{
				FString Value;
				AppIdHandle->GetValue(Value);
				return Value.IsEmpty() ? EVisibility::Visible : EVisibility::Collapsed;
			})
			.ColorAndOpacity(FLinearColor::Red)
			.Font(IDetailLayoutBuilder::GetDetailFont())
		]
	];

	// GameId
	TSharedRef<IPropertyHandle> GameIdHandle = DetailBuilder.GetProperty(GET_MEMBER_NAME_CHECKED(UPlayerZeroDeveloperSettings, GameId));
	GameIdHandle->MarkHiddenByCustomization();

	Category.AddProperty(GameIdHandle)
	.CustomWidget()
	.NameContent()
	[
		GameIdHandle->CreatePropertyNameWidget()
	]
	.ValueContent()
	.MinDesiredWidth(300)
	[
		SNew(SVerticalBox)

		+ SVerticalBox::Slot()
		.AutoHeight()
		[
			GameIdHandle->CreatePropertyValueWidget()
		]

		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(0, 2)
		[
			SNew(STextBlock)
			.Text(LOCTEXT("GameIdMissing", "GameId is required"))
			.Visibility_Lambda([GameIdHandle]() -> EVisibility
			{
				FString Value;
				GameIdHandle->GetValue(Value);
				return Value.IsEmpty() ? EVisibility::Visible : EVisibility::Collapsed;
			})
			.ColorAndOpacity(FLinearColor::Red)
			.Font(IDetailLayoutBuilder::GetDetailFont())
		]
	];

	// DefaultAvatarId
	TSharedRef<IPropertyHandle> AvatarIdHandle = DetailBuilder.GetProperty(GET_MEMBER_NAME_CHECKED(UPlayerZeroDeveloperSettings, DefaultAvatarId));
	AvatarIdHandle->MarkHiddenByCustomization();

	Category.AddProperty(AvatarIdHandle)
	.CustomWidget()
	.NameContent()
	[
		AvatarIdHandle->CreatePropertyNameWidget()
	]
	.ValueContent()
	.MinDesiredWidth(300)
	[
		SNew(SVerticalBox)

		+ SVerticalBox::Slot()
		.AutoHeight()
		[
			AvatarIdHandle->CreatePropertyValueWidget()
		]

		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(0, 2)
		[
			SNew(STextBlock)
			.Text(LOCTEXT("AvatarIdMissing", "DefaultAvatarId is required"))
			.Visibility_Lambda([AvatarIdHandle]() -> EVisibility
			{
				FString Value;
				AvatarIdHandle->GetValue(Value);
				return Value.IsEmpty() ? EVisibility::Visible : EVisibility::Collapsed;
			})
			.ColorAndOpacity(FLinearColor::Red)
			.Font(IDetailLayoutBuilder::GetDetailFont())
		]
	];

}


bool FPlayerZeroDeveloperSettingsCustomization::ShouldShowWarning(const UPlayerZeroDeveloperSettings* Settings) const
{
	return Settings
		&& (Settings->ApplicationId.IsEmpty()
		|| Settings->GameId.IsEmpty()
		|| Settings->DefaultAvatarId.IsEmpty());
}

#undef LOCTEXT_NAMESPACE
