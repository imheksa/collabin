#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"

struct FApplicationListResponse;
struct FOrganizationListResponse;
class FDeveloperAccountApi;
struct FDeveloperLoginResponse;
class FDeveloperAuthApi;

DECLARE_DELEGATE_OneParam(FOnLoginSuccess, const FString&);

class PLAYERZEROEDITOR_API SPlayerZeroLoginPanel : public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SPlayerZeroLoginPanel) {}
	SLATE_END_ARGS()


	void Construct(const FArguments& InArgs);
	
	FOnLoginSuccess OnLoginSuccess;
private:
	TSharedPtr<FDeveloperAuthApi> DeveloperAuthApi;
	TSharedPtr<SEditableTextBox> EmailTextBox;
	TSharedPtr<SEditableTextBox> PasswordTextBox;
	TSharedPtr<STextBlock> EmailErrorText;
	TSharedPtr<STextBlock> PasswordErrorText;
	TSharedPtr<STextBlock> LoginErrorText;
	static constexpr const TCHAR* CacheKeyEmail = TEXT("PlayerZero-Email");
	bool bShowErrorMessage = false;
	bool bFailedLogin = false;
	FReply OnLoginClicked();

	void Initialize();
	void HandleLoginResponse(const FDeveloperLoginResponse& Response, bool bWasSuccessful);
	void OnTextChanged(const FText& Text);
	void UpdateErrorMessages();
	bool IsInputTextValid() const;
};