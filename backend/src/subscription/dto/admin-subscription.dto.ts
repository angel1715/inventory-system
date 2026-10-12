import { IsIn } from "class-validator";

export class ApprovePaymentDto {
    @IsIn(["SUBSCRIPTION", "LIFETIME"])
    planType!: "SUBSCRIPTION" | "LIFETIME";
}

export class ToggleStatusDto {
    @IsIn(["ACTIVE", "CANCELED"])
    status!: "ACTIVE" | "CANCELED";
}

export class UpdatePlanDto {
    @IsIn(["SUBSCRIPTION", "LIFETIME"])
    accessType!: "SUBSCRIPTION" | "LIFETIME";

    @IsIn(["ACTIVE", "CANCELED"])
    subscriptionStatus!: "ACTIVE" | "CANCELED";
}