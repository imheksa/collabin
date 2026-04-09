#pragma once

#include "IDetailCustomization.h"

class IDetailLayoutBuilder;

/**
 * Customization for UPlayerZeroDeveloperSettings to add validation warnings.
 */
class FPlayerZeroDeveloperSettingsCustomization : public IDetailCustomization
{
public:
	static TSharedRef<IDetailCustomization> MakeInstance();

	virtual void CustomizeDetails(IDetailLayoutBuilder& DetailBuilder) override;

private:
	bool ShouldShowWarning(const class UPlayerZeroDeveloperSettings* Settings) const;
};
