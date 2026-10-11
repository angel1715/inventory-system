import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

// Campos que revelan el margen del negocio: solo los ven el dueño y el admin.
const HIDDEN_FOR_EMPLOYEES = ["costPrice", "costPriceSnapshot"];

@Injectable()
export class HideCostInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const role = context.switchToHttp().getRequest().user?.role;

        if (role === "OWNER" || role === "ADMIN") return next.handle();

        return next.handle().pipe(map((data) => this.strip(data)));
    }

    private strip(value: any): any {
        if (Array.isArray(value)) return value.map((v) => this.strip(v));

        // Solo objetos planos: las fechas y los Decimal de Prisma se devuelven tal cual
        const proto = value && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
        if (value && typeof value === "object" && (proto === Object.prototype || proto === null)) {
            const result: Record<string, any> = {};
            for (const [key, val] of Object.entries(value)) {
                if (!HIDDEN_FOR_EMPLOYEES.includes(key)) result[key] = this.strip(val);
            }
            return result;
        }

        return value;
    }
}