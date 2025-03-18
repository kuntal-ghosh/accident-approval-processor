/**
 * Criteria Validator Module
 * 
 * This module provides validation functions for various accident approval criteria.
 */

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export interface CriteriaValidator<T> {
    validate(data: T): ValidationResult;
    getName(): string;
}

/**
 * Base abstract class for all criteria validators
 */
export abstract class BaseCriteriaValidator<T> implements CriteriaValidator<T> {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    abstract validate(data: T): ValidationResult;

    getName(): string {
        return this.name;
    }
}

/**
 * Example implementations
 */

export class AccidentDateValidator extends BaseCriteriaValidator<{ accidentDate: Date }> {
    constructor() {
        super('AccidentDateValidator');
    }

    validate(data: { accidentDate: Date }): ValidationResult {
        if (!data.accidentDate) {
            return { isValid: false, message: 'Accident date is required' };
        }

        const today = new Date();
        if (data.accidentDate > today) {
            return { isValid: false, message: 'Accident date cannot be in the future' };
        }

        return { isValid: true };
    }
}

export class SeverityValidator extends BaseCriteriaValidator<{ severityLevel: number }> {
    constructor() {
        super('SeverityValidator');
    }

    validate(data: { severityLevel: number }): ValidationResult {
        if (typeof data.severityLevel !== 'number') {
            return { isValid: false, message: 'Severity level must be a number' };
        }

        if (data.severityLevel < 1 || data.severityLevel > 5) {
            return { isValid: false, message: 'Severity level must be between 1 and 5' };
        }

        return { isValid: true };
    }
}

// Export a composite validator that can run multiple validators
export class CompositeValidator<T> implements CriteriaValidator<T> {
    private validators: CriteriaValidator<T>[];
    
    constructor(validators: CriteriaValidator<T>[]) {
        this.validators = validators;
    }

    validate(data: T): ValidationResult {
        for (const validator of this.validators) {
            const result = validator.validate(data);
            if (!result.isValid) {
                return result;
            }
        }
        return { isValid: true };
    }

    getName(): string {
        return 'CompositeValidator';
    }
}