window.onload = (function () {
    const document = window.document;
    // constIABLES
    const calc = document.querySelector(".calculator");
    const calcDisplay = calc.querySelector("#display");
    const calcKeys = calc.querySelectorAll(".calculator__key");
    const calcButtons = calc.querySelectorAll(".calculator__button");
    const calcButtonsOperators = calc.querySelectorAll(".calculator__operator");
    const calcClear = calc.querySelectorAll(".calculator__clear");
    const calcEqual = calc.querySelector(".calculator__key--equal");
    const calcPower = calc.querySelectorAll(".calculator__power");
    const calcSpace = calc.querySelectorAll(".calculator__backspace");
    const displayManager = new DisplayManager(calcDisplay);

    // INIT CALC KEYS
    calcKeys.forEach(function (currentNode) {
        const currentText = currentNode.getAttribute("value");
        currentNode.textContent = currentText;
    });

    calcButtons.forEach(function (currentNode) {
        currentNode.addEventListener("click", function () {
            displayManager.addOperand(this.getAttribute("value"));
        });
    });

    calcButtonsOperators.forEach(function (currentNode) {
        currentNode.addEventListener("click", function () {
            displayManager.addOperator(this.getAttribute("value"));
        });
    });

    // CLEAR INPUT
    calcClear.forEach(function (currentNode) {
        currentNode.addEventListener("click", function () {
            calcDisplay.value = "";
        });
    });

    // SHOW RESULT
    calcEqual.addEventListener("click", function () {
        calcDisplay.value = calculate(calcDisplay.value);
    });

    //Починить
    // POWER BUTTON
    calcPower.on("click", function () {
        calcDisplay.val(Math.pow(calcDisplay.val(), 3));
    });

    // BACKSPACE BUTTON
    calcSpace.on("click", function () { // https://www.w3schools.com/jsref/jsref_substring.asp
        calcDisplay.val(calcDisplay.val().substring(0, calcDisplay.val().length - 1));
    });
});

maxPriority = 2;

calculate = (input) => {
    const parser = new Parser();
    const parts = parser.parseOperandsAndOperators(input);
    const builder = new BinaryExpressionTreeBuilder();
    const tree = builder.build(parts);
    return tree.execute();
};


class Parser {
    parseOperandsAndOperators = rawString => {
        const strings = rawString.split(" ");
        const isAllRight = strings.every(str => !isNaN(Number(str)) || OperationRegistry.some(x => x.name === str));
        if (!isAllRight) {
            throw new Error("Лина косячит с вводом");
        }
        return strings;
    }
}

class DisplayManager {
    constructor(display) {
        this.display = display;
    }
    addOperand(operand) {
        if (this.display.value === "")
            this.display.value = operand;
        else if (OperationRegistry.some(x => x.name === this.display.value[this.display.value.length - 1]))
            this.display.value = this.display.value + " " + operand;
        else
            this.display.value = this.display.value + operand;
    }
    addOperator(operator) {
        if (OperationRegistry.some(x => x.name === operator)) {
            if (OperationRegistry.some(x => x.name === this.display.value[this.display.value.length - 1])) {
                const withoutLast = this.display.value.substring(0, this.display.value.length - 1);
                this.display.value = withoutLast + operator;
            } else {
                this.display.value = this.display.value + " " + operator;
            }
        }
    }
}

class BinaryExpressionTreeBuilder {
    build = (operatorsAndOperands) => {
        // Получаем все возможные операторы с минимальным приоритетом присутствующие в инпуте
        const currentPriorityOperators = this.getExistingOperators(operatorsAndOperands);
        // Находим первый попавшийся оператор с наименьшим приоритетом
        const index = operatorsAndOperands.findIndex(part => currentPriorityOperators.includes(part));

        let left = operatorsAndOperands.slice(0, index);
        let right = operatorsAndOperands.slice(index + 1, operatorsAndOperands.length);
        const operator = OperationRegistry.find(x => x.name === operatorsAndOperands[index]);
        left = left.length > 1 ? left : left[0];
        right = right.length > 1 ? right : right[0];

        if (isNaN(Number(left)))
            left = this.build(left)

        if (isNaN(Number(right)))
            right = this.build(right)

        return new BinaryExpression(left, right, operator);
    }
    getExistingOperators = (operatorsAndOperands, previousPriority) => {
        if (!previousPriority)
            previousPriority = Object.values(OperationRegistry)
                .map(a => a.priority)
                .reduce((prev, current) => (prev < current) ? prev : current);

        // чтобы изменять приоритет только тогда, когда операторов с предыдущим уже не осталось
        let currentPriorityOperators = OperationRegistry
            .filter(operator => operator.priority === previousPriority && operatorsAndOperands.includes(operator.name))
            .map(operator => operator.name);

        if (!currentPriorityOperators.length) {
            return previousPriority + 1 <= maxPriority
                ? this.getExistingOperators(operatorsAndOperands, previousPriority + 1)
                : [];
        }

        return currentPriorityOperators;
    }
}

class BinaryExpression {
    constructor(left, right, operator) {
        this.left = left;
        this.right = right;
        if (!operator instanceof Operation)
            throw new Error("Акстись, мне нужен экземпляр класса Operation")
        this.operator = operator;
    }

    execute() {
        const leftResult = this.resolveOperand(this.left);
        const rightResult = this.resolveOperand(this.right);
        const result = this.operator.execute(leftResult, rightResult);
        return result;
    }

    resolveOperand(operand) {
        let operandResult;
        if (operand instanceof BinaryExpression) {
            operandResult = operand.execute();
        } else if (!isNaN(operand)) {
            operandResult = new Number(operand)
        } else {
            throw new Error("operand not implemented")
        }
        return operandResult;
    }

    getString() {
        return `${this.left} ${this.operator} ${this.right}`;
    }
}

class Operation {
    constructor(operation) {
        this.operation = OperationRegistry.find(x => x.name === operation);
        if (!this.operation) {
            throw new Error("Такая операция ещё не реализована в калькуляторе");
        }
    }

    execute(left, right) {
        return this.operation.execute(left, right);
    }
}

OperationRegistry = [
    {
        execute: (left, right) => left * right,
        priority: 2,
        name: "*"
    },
    {
        execute: (left, right) => left + right,
        priority: 1,
        name: "+"
    },
    {
        execute: (left, right) => left - right,
        priority: 1,
        name: "-"
    },
    {
        execute: (left, right) => left / right,
        priority: 1,
        name: "/"
    }
]