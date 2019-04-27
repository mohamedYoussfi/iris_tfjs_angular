import {Component, OnInit} from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import {HttpClient} from '@angular/common/http';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{

   public tensors:tf.Tensor2D[]=[];
   public operation:string;
   public model:tf.Sequential;
   public learningRate:number=0.01;
  private modelCreated: boolean;
  public xs:Array<number[]>=[];
  public ys:Array<number[]>=[];
  public xsTest:Array<number[]>=[];
  public ysTest:Array<number[]>=[];
  public irisClasses=['Iris-setosa','Iris-versicolor','Iris-virginica'];
  currentEpoch: number=0;
  currentAccuracy: number=0;
  currentLoss: number=0;
  correctEval:number=0;
  wrongEval:number=0;
  example={SepalLengthCm:5.1,SepalWidthCm:3.5,PetalLengthCm:1.4,PetalWidthCm:0.2};
  prediction: any;
  epochs:number=100;

  constructor(private httpClient:HttpClient){}

  ngOnInit(): void {
    this.tensors['X']=tf.tensor([3,10,11,1.70,-12,1.20,100,1.70,7, 25,-12,-34],[3,4]);
    this.tensors['Y']=tf.tensor([[0.3,0.5,0.24],[0.1,0.5,0.74],[-0.13,0.56,0.24],
      [0.1,0.8,0.28]]);
    this.tensors['X'].print();
    this.tensors['Y'].print();
  }

  onMult() {
    this.tensors['Z']=this.tensors['X'].matMul(this.tensors['Y']);
    this.operation="X.matMul(Y)";
  }

  onTranspose(t: string) {
    this.tensors['Z']=this.tensors[t].transpose();
    this.operation="X.transose()";
  }

  onRelu(t: string) {
    this.tensors['Z']=tf.relu(this.tensors[t]);
    this.operation="X.relu()";
  }
  onSigmoid(t: string) {
    this.tensors['Z']=tf.sigmoid(this.tensors[t]);
    this.operation="X.sigmoid()";
  }

  onCreateModel() {
    this.model=tf.sequential();
    this.model.add(tf.layers.dense({
      units:10, inputShape:[4],activation:'sigmoid'
    }));
    this.model.add(tf.layers.dense({
      units:3,activation:'softmax'
    }));
    this.model.compile({
      optimizer:tf.train.adam(this.learningRate),
      loss:tf.losses.meanSquaredError,
      metrics:['accuracy']
    });
    this.modelCreated=true;
  }

  onLoadData() {
    this.httpClient.get("assets/iris-train.csv",{responseType:'text'})
      .subscribe(data=>{
        let parsedData=this.parseData(data);
        this.xs=parsedData.xs;
        this.ys=parsedData.ys;
      },err=>{
        console.log(err);
      });
    this.httpClient.get("assets/irisTest.csv",{responseType:'text'})
      .subscribe(data=>{
        let parsedData=this.parseData(data);
        this.xsTest=parsedData.xs;
        this.ysTest=parsedData.ys;
      },err=>{
        console.log(err);
      });
  }

  parseData(data){
    let inputs=[];
    let outputs=[];
    let lines=data.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      if(lines[i]!==''){
        let line=lines[i].split(",");
        inputs.push([
          parseFloat(line[0]),
          parseFloat(line[1]),
          parseFloat(line[2]),
          parseFloat(line[3])]);
        let output=[0,0,0];output[parseInt(line[4])]=1;
        outputs.push(output);
      }
    }
    return {xs:inputs,ys:outputs };
  }
  getIrisClass(data){
    //let t=tf.tensor1d(data);
    let index=data.indexOf(1);
    return this.irisClasses[index];
  }

  onTrainModel() {
    const inputs:tf.Tensor2D=tf.tensor2d(this.xs);
    const targets:tf.Tensor2D=tf.tensor2d(this.ys);
    const inputsTest:tf.Tensor2D=tf.tensor2d(this.xsTest);
    const targetsTest:tf.Tensor2D=tf.tensor2d(this.ysTest);
      this.model.fit(inputs,targets,{
        epochs:this.epochs,
        validationData:[inputsTest,targetsTest],
        callbacks:{
          onEpochEnd:(epoch,logs)=>{
            this.currentEpoch=epoch;
            this.currentLoss=logs.loss;
            this.currentAccuracy=logs.acc;
          }
        }
      }).then(resp=>{

      });

  }

  onSaveModel() {
    this.model.save('localstorage://irisModel')
      .then(result=>{
        alert('Success saving model!');
      },err=>{
        alert('Error saving Model!');
      })
  }

  onLoadModel() {
    tf.loadLayersModel('localstorage://irisModel')
      .then(m=>{
        this.model=m;
        this.model.compile({
          optimizer:tf.train.adam(this.learningRate),
          loss:tf.losses.meanSquaredError,
          metrics:['accuracy']
        });
        this.modelCreated=true;
        alert("Model loaded!");
      })
  }

  onEvalModel() {
    let inputsTest=tf.tensor2d(this.xsTest);
    let targetTest=tf.tensor2d(this.ysTest);
    let yTrue=targetTest.argMax(-1).dataSync();
    let predictions=this.model.predict(inputsTest);
    // @ts-ignore
    let yPredictions=predictions.argMax(-1).dataSync();
    this.correctEval=0;
    this.wrongEval=0;
    for (let i = 0; i < yPredictions.length; i++) {
      if(yTrue[i]==yPredictions[i]) ++this.correctEval
      else ++this.wrongEval;
    }

  }

  onPredict(value: any) {
    let x1=parseFloat(value.SepalLengthCm);
    let x2=parseFloat(value.SepalWidthCm);
    let x3=parseFloat(value.PetalLengthCm);
    let x4=parseFloat(value.PetalWidthCm);
    let input=tf.tensor2d([[x1,x2,x3,x4]]);
    const prediction=this.model.predict( input);
    // @ts-ignore
    let index=prediction.argMax(-1).dataSync()[0];
    this.prediction=this.irisClasses[index];
  }
}
