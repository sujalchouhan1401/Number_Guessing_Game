#include<stdio.h>
#include<stdlib.h>
#include<time.h>

int main(){
    srand(time(0));

    int randomnumber = (rand() % 100)+1;
    int no_of_guesses = 0;
    int guessed;

    do{
        printf("Guess the number: ");
        scanf("%d",&guessed);

        if(guessed > randomnumber){
            printf("Lower Number Please!!\n");
        }
        else if(randomnumber >guessed){
            printf("Higher Number Please!!\n");   
        }
        else{
            printf("Congratulations!!\n");
        }
        no_of_guesses++;
    }
    while(guessed != randomnumber);
    printf("You guessed the Nummber in %d guesses.",no_of_guesses);

    return 0;
}